import type { ParsedGoalDraft } from "@/lib/types";
import { z } from "zod";
import { xaiChatCompletion } from "./client";
import {
  extractGoalAmount,
  extractGoalName,
  parseTargetDate,
} from "./parse-goal";

export type DestinationTurn = { role: "user" | "assistant"; content: string };

export type DestinationReply = {
  reply: string;
  /** Set once name, amount, and date are all known — the client then creates the goal. */
  goal: ParsedGoalDraft | null;
};

function isoToday(ref: Date): string {
  const mm = String(ref.getMonth() + 1).padStart(2, "0");
  const dd = String(ref.getDate()).padStart(2, "0");
  return `${ref.getFullYear()}-${mm}-${dd}`;
}

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatUsd(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function goalSchema(today: string) {
  return z.object({
    name: z.string().trim().min(1).max(80),
    targetAmount: z.coerce.number().positive().max(100_000),
    targetDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((d) => d > today, "target date must be in the future"),
  });
}

function systemPrompt(today: string): string {
  return `You are Polaris, a warm, upbeat GPS-style guide that helps a college student set ONE savings destination.
Today is ${today}.

To set a destination you need three things:
1. name: what they're saving for (short, e.g. "Flight home")
2. targetAmount: dollars needed (a number)
3. targetDate: when they need it (YYYY-MM-DD, after today)

Rules:
- Read the whole conversation; details may be spread across messages.
- If something is missing, ask for exactly ONE missing thing in a short, friendly question. You may suggest a typical amount or date, but never assume one without the user confirming it.
- "By winter break", "end of semester" etc. are fine: pick a sensible date and say it back so they can correct you.
- Once all three are known, confirm them in one sentence and say you're plotting the route.
- If they ask something off-topic, answer in one sentence and steer back to their destination.
- Speak naturally: amounts like "$400", dates like "Dec 15" (never YYYY-MM-DD in the reply).
- Example confirmation: "Locked in: $400 for a flight home by Dec 15. Plotting your route now."
- Max 2 short sentences. No markdown, no emoji, no lists.

Reply ONLY with JSON, no code fences:
{"reply":"<what you say>","goal":null}
or, once all three are known:
{"reply":"<confirmation>","goal":{"name":"...","targetAmount":400,"targetDate":"YYYY-MM-DD"}}`;
}

async function askGrok(
  turns: DestinationTurn[],
  today: string,
): Promise<DestinationReply | null> {
  const raw = await xaiChatCompletion([
    { role: "system", content: systemPrompt(today) },
    ...turns,
  ]);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
  const shape = z
    .object({ reply: z.string().trim().min(1).max(600), goal: z.unknown() })
    .safeParse(parsed);
  if (!shape.success) return null;

  const goal =
    shape.data.goal == null
      ? null
      : goalSchema(today).safeParse(shape.data.goal);
  if (goal && !goal.success) return null; // half-formed goal: let the fallback re-ask
  const data = goal?.data;
  return {
    reply: shape.data.reply,
    goal: data
      ? { ...data, name: data.name.charAt(0).toUpperCase() + data.name.slice(1) }
      : null,
  };
}

/**
 * No-LLM path: fill name/amount/date from the user's messages (latest wins)
 * and ask for whatever is still missing.
 */
export function fallbackDestinationReply(
  turns: DestinationTurn[],
  ref: Date = new Date(),
): DestinationReply {
  const today = isoToday(ref);
  let name: string | null = null;
  let amount: number | null = null;
  let date: string | null = null;

  for (const turn of turns) {
    if (turn.role !== "user") continue;
    const text = turn.content;
    const turnAmount = extractGoalAmount(text);
    const turnDate = parseTargetDate(text, ref);
    const turnName =
      extractGoalName(text) ??
      // A bare answer like "a flight home" to "what are you saving for?"
      (turnAmount == null && turnDate == null && text.trim().length <= 60
        ? text.trim().replace(/^(an?|the|my)\s+/i, "")
        : null);

    if (turnName) name = turnName.charAt(0).toUpperCase() + turnName.slice(1);
    if (turnAmount != null) amount = turnAmount;
    if (turnDate && turnDate > today) date = turnDate;
  }

  if (!name) {
    return {
      reply: "Where are you headed? Tell me what you're saving for.",
      goal: null,
    };
  }
  if (amount == null) {
    return { reply: `${name}, nice. How much do you need for it?`, goal: null };
  }
  if (!date) {
    return {
      reply: `Got it, ${formatUsd(amount)} for ${name.toLowerCase()}. When do you need it by? A date like Dec 15 works.`,
      goal: null,
    };
  }
  return {
    reply: `Destination locked: ${formatUsd(amount)} for ${name.toLowerCase()} by ${formatDate(date)}. Plotting your route now.`,
    goal: { name, targetAmount: amount, targetDate: date },
  };
}

export async function destinationChat(
  turns: DestinationTurn[],
  ref: Date = new Date(),
): Promise<DestinationReply> {
  try {
    const fromGrok = await askGrok(turns, isoToday(ref));
    if (fromGrok) return fromGrok;
  } catch (e) {
    console.error("[grok] destination chat failed; using fallback", e);
  }
  return fallbackDestinationReply(turns, ref);
}

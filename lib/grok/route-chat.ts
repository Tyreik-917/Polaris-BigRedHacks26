import type { FinancialSnapshot } from "@/lib/nessie/types";
import type { Goal, Projection } from "@/lib/types";
import { z } from "zod";
import { xaiChatCompletion } from "./client";
import { parseSpendingReportHeuristic } from "./parse-spending-report";

export type RouteChatTurn = { role: "user" | "assistant"; content: string };

export type RouteIntent =
  | { kind: "purchase"; amount: number; description: string }
  | { kind: "income"; amount: number; description: string }
  | { kind: "question" };

const QUESTION_START =
  /^(can|could|should|what|what's|whats|how|when|why|where|am|is|are|will|would|do|does|did|if|which|tell me|help)\b/i;
const SPEND_VERB =
  /\b(spent|spend|bought|paid for|paid|got|grabbed|ordered|picked up|had to buy|purchased|treated myself)\b/i;

/** Money coming in, checked before SPEND_VERB ("got paid", "got $200 from my mom"). */
const INCOME_CUES: [RegExp, string][] = [
  [/\b(got paid|get paid|paycheck|payday|direct deposit)\b/i, "Paycheck"],
  [/\b(extra shift|overtime|tips?)\b/i, "Extra shift"],
  [/\b(sent me|gave me|venmo'?d me|zelle'?d me|paid me back|paid me|from my (mom|dad|parents|family|grandma|grandpa))\b/i, "Money from someone"],
  [/\b(refund(ed)?|reimburs\w*|got .{0,20}back)\b/i, "Refund"],
  [/\b(sold)\b/i, "Sale"],
  [/\b(earned|made|received|bonus|scholarship|stipend)\b/i, "Income"],
];

function amountIn(text: string): number | null {
  const m =
    text.match(/\$\s*(\d[\d,]*(?:\.\d{1,2})?)/) ??
    text.match(/\b(\d[\d,]*(?:\.\d{1,2})?)\s*(?:dollars?|bucks?)\b/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 && n <= 50_000 ? n : null;
}

/**
 * Purchase, income, or question? Clear cases are decided locally (instant);
 * only ambiguous messages go to Grok. "Can I afford a $40 concert?" must not be logged.
 */
export async function classifyRouteMessage(
  text: string,
  ref: Date = new Date(),
): Promise<RouteIntent> {
  const trimmed = text.trim();
  if (trimmed.endsWith("?") || QUESTION_START.test(trimmed)) {
    return { kind: "question" };
  }

  const amount = amountIn(trimmed);
  if (amount != null) {
    const income = INCOME_CUES.find(([re]) => re.test(trimmed));
    if (income) return { kind: "income", amount, description: income[1] };
  }

  const spend = parseSpendingReportHeuristic(trimmed, ref);
  if (spend && SPEND_VERB.test(trimmed)) {
    return { kind: "purchase", amount: spend.amount, description: spend.description };
  }

  const raw = await xaiChatCompletion([
    {
      role: "system",
      content:
        'Classify a message sent to a savings app. "purchase" = money the user ALREADY spent. "income" = money the user ALREADY received (pay, gift, refund, sale). Anything else (questions, plans, hypotheticals, chit-chat) = "question". Reply ONLY with JSON: {"intent":"purchase"|"income"|"question","amount":0,"description":""}. description is a short noun like "textbook" or "paycheck".',
    },
    { role: "user", content: trimmed },
  ]).catch(() => null);

  if (raw) {
    const parsed = z
      .object({
        intent: z.enum(["purchase", "income", "question"]),
        amount: z.coerce.number().optional(),
        description: z.string().optional(),
      })
      .safeParse(safeJson(raw));
    if (parsed.success) {
      const { intent, amount: n, description } = parsed.data;
      if (intent === "question") return { kind: "question" };
      if (n && n > 0 && n <= 50_000 && description?.trim()) {
        const label = description.trim().slice(0, 120);
        return { kind: intent, amount: n, description: label };
      }
    }
  }

  // Grok unavailable or unsure: only log a purchase with an unmistakable amount.
  return spend
    ? { kind: "purchase", amount: spend.amount, description: spend.description }
    : { kind: "question" };
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function fmtUsd(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? `$${rounded}` : `$${rounded.toFixed(2)}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) /
      86_400_000,
  );
}

function nextMoveLine(p: Projection): string {
  const move = p.nextMove;
  if (!move) return "";
  return move.daysGained > 0
    ? ` Next move: ${move.label.toLowerCase()} to win back ${move.daysGained} day${move.daysGained === 1 ? "" : "s"}.`
    : ` Next move: ${move.label.toLowerCase()} (saves ${fmtUsd(move.savings)}).`;
}

/** Reply for a logged purchase. Numbers come from the projection, never the model. */
export function describePurchaseImpact(
  purchase: { amount: number; description: string },
  goal: Goal,
  before: Projection,
  after: Projection,
): string {
  const logged = `Logged: ${purchase.description}, ${fmtUsd(purchase.amount)}.`;

  if (before.eta && after.eta) {
    const delta = daysBetween(before.eta, after.eta);
    if (delta > 0) {
      return `${logged} That pushes your arrival back ${delta} day${delta === 1 ? "" : "s"}, to ${fmtDate(after.eta)}.${nextMoveLine(after)}`;
    }
    return `${logged} Your arrival holds at ${fmtDate(after.eta)}. You're still on route.`;
  }
  if (before.eta && !after.eta) {
    return `${logged} Rerouting: at this pace you no longer reach ${goal.name.toLowerCase()}.${nextMoveLine(after)}`;
  }
  return `${logged} You were already off course, so that widens the gap by ${fmtUsd(purchase.amount)}.${nextMoveLine(after)}`;
}

/** Reply for logged income. Numbers come from the projection, never the model. */
export function describeIncomeImpact(
  income: { amount: number; description: string },
  goal: Goal,
  before: Projection,
  after: Projection,
): string {
  const added = `Added: ${income.description.toLowerCase()}, ${fmtUsd(income.amount)}.`;

  if (!before.eta && after.eta) {
    return after.onTrack
      ? `${added} You're back on course: arriving ${fmtDate(after.eta)}, in time for ${goal.name.toLowerCase()}.`
      : `${added} ${goal.name} is back in reach: arriving ${fmtDate(after.eta)}.${nextMoveLine(after)}`;
  }
  if (before.eta && after.eta) {
    const gained = daysBetween(after.eta, before.eta);
    if (gained > 0) {
      return `${added} That moves your arrival up ${gained} day${gained === 1 ? "" : "s"}, to ${fmtDate(after.eta)}.`;
    }
    return `${added} Your arrival holds at ${fmtDate(after.eta)}.`;
  }
  return `${added} You're still short at this pace, but that closes the gap by ${fmtUsd(income.amount)}.${nextMoveLine(after)}`;
}

function routeStatus(goal: Goal, p: Projection): string {
  if (!p.eta) return "Off course: at the current pace they don't reach the goal yet.";
  if (p.onTrack) return `On course: arriving ${fmtDate(p.eta)}, on or before the ${fmtDate(goal.targetDate)} target.`;
  return `Behind: arriving ${fmtDate(p.eta)}, ${p.daysLate} days after the ${fmtDate(goal.targetDate)} target.`;
}

function routeFacts(goal: Goal, p: Projection, s: FinancialSnapshot) {
  return {
    goal: { name: goal.name, targetAmount: fmtUsd(goal.targetAmount), targetDate: fmtDate(goal.targetDate) },
    route: {
      status: routeStatus(goal, p),
      availableTowardGoalNow: fmtUsd(Math.round(p.saved)),
      availableTowardGoalMeaning:
        "savings balance plus reported income minus reported spending toward the goal",
      nextMove: p.nextMove && {
        label: p.nextMove.label,
        saves: fmtUsd(p.nextMove.savings),
        daysSooner: p.nextMove.daysGained,
      },
      recoveryMoves: p.recoveryMoves.map((m) => m.label),
      arrivalIfAllRecoveryMovesApplied: p.etaWithMoves ? fmtDate(p.etaWithMoves) : null,
    },
    accounts: {
      checking: s.checkingBalance,
      savings: s.savingsBalance,
      paycheck: s.estimatedPaycheckAmount,
      paycheckEveryDays: s.paycheckIntervalDays,
      avgDailySpend: Math.round(s.avgDailySpend * 100) / 100,
      upcomingBills: s.bills
        .slice()
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 4)
        .map((b) => ({ payee: b.payee, amount: fmtUsd(b.amount), due: fmtDate(b.dueDate) })),
    },
  };
}

function fallbackAnswer(goal: Goal, p: Projection): string {
  const where = p.eta
    ? p.onTrack
      ? `You're on course to reach ${goal.name.toLowerCase()} by ${fmtDate(p.eta)}.`
      : `At this pace you arrive ${fmtDate(p.eta)}, ${p.daysLate} days after your target.`
    : `At this pace you don't reach ${goal.name.toLowerCase()} yet.`;
  return `${where}${nextMoveLine(p)} Tell me about any purchase and I'll update your route.`;
}

/** Grok answers route questions from the same projection the map shows. */
export async function answerRouteQuestion(
  goal: Goal,
  projection: Projection,
  snapshot: FinancialSnapshot,
  turns: RouteChatTurn[],
): Promise<string> {
  const system = `You are Polaris, a calm GPS-style money guide for a college student who is on a route to a savings goal.
Answer using ONLY the facts in this JSON. Never invent or calculate new dollar amounts or dates; you may repeat the ones given.
For hypotheticals ("can I afford a $40 concert?"), reason directionally from the facts (spending more pushes arrival later) and suggest the next move.
Start from route.status. When they're off course, say "at this pace you won't get there yet" (never "arrive never"), then give the next move. Never shame spending.
Speak like turn-by-turn directions: 2-3 short sentences, second person, no markdown, no lists. Dates like "Dec 15".
If they mention a purchase they already made, tell them to say it like "I spent $30 on a textbook" so you can log it.

Facts: ${JSON.stringify(routeFacts(goal, projection, snapshot))}`;

  const raw = await xaiChatCompletion([
    { role: "system", content: system },
    ...turns.slice(-10).map((t) => ({ role: t.role, content: t.content.slice(0, 1000) })),
  ]).catch((e: unknown) => {
    console.error("[grok] route chat failed", e);
    return null;
  });

  return raw?.trim() || fallbackAnswer(goal, projection);
}

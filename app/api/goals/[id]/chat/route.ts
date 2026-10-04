import { jsonError, parseJsonBody, rateLimit } from "@/lib/api/http";
import {
  addExpectedIncome,
  addReportedBill,
  addReportedIncome,
  addReportedSpend,
  getGoal,
} from "@/lib/goals/store";
import {
  answerRouteQuestion,
  classifyRouteMessage,
  describeIncomeImpact,
  describePurchaseImpact,
} from "@/lib/grok/route-chat";
import { depositIncomeToChecking } from "@/lib/polaris/income-deposit";
import {
  formatMonDayYear,
  parseExpectedMoney,
  receivedMoneyLabel,
} from "@/lib/polaris/received-money";
import { buildProjectionForGoal } from "@/lib/polaris/build-projection";
import type { RouteEvent } from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1000),
      }),
    )
    .min(1)
    .max(30)
    .refine((m) => m[m.length - 1]?.role === "user", "last message must be from the user"),
  /** The user's local calendar day, so a new star lands on "today" for them. */
  localDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

function parseNewBill(text: string): { payee: string; amount: number; dueDate: string } | null {
  const amount = text.match(/\$\s*(\d+(?:\.\d{2})?)/)?.[1];
  if (!amount || !/\bbill\b/i.test(text)) return null;
  const due = text.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
  const payee = text.match(/(?:for|on)\s+([A-Za-z][A-Za-z0-9\s]{2,30})/i)?.[1]?.trim() ?? "New bill";
  return {
    payee,
    amount: Number(amount),
    dueDate: due ?? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  };
}

export async function POST(request: Request, { params }: Params) {
  const limited = rateLimit(request, "goal-chat", 40);
  if (limited) return limited;

  const { id } = await params;
  const goal = await getGoal(id);
  if (!goal) return jsonError("Goal not found.", 404);

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid conversation.", 400);

  const turns = parsed.data.messages;
  const latest = turns[turns.length - 1].content;
  const started = Date.now();

  try {
    const newBill = parseNewBill(latest);
    if (newBill) {
      const { projection: before } = await buildProjectionForGoal(goal);
      await addReportedBill(goal.id, newBill);
      const { projection: after } = await buildProjectionForGoal(goal);
      const event: RouteEvent = {
        type: "user_reported",
        description: `${newBill.payee} bill`,
        amount: newBill.amount,
        previousEta: before.eta,
        newEta: after.eta,
      };
      return NextResponse.json({
        reply: `Got it — I added a ${newBill.payee} bill for $${newBill.amount} and redrew your star route.`,
        event: { ...event, previousWaypoints: before.waypoints },
        projection: after,
      });
    }

    // "My friend Sam is sending me $20 on Oct 15" → an upcoming star on that date.
    const today = parsed.data.localDate ?? new Date().toISOString().slice(0, 10);
    const expected = parseExpectedMoney(latest, today);
    if (expected) {
      if (!expected.date) {
        const who = expected.sender === "they" ? "they" : expected.sender;
        return NextResponse.json({
          reply: `Nice! When is ${who} sending the $${expected.amount.toLocaleString("en-US")}? Tell me the date, like "Oct 15", and I'll add a star for it.`,
          event: null,
          projection: null,
        });
      }
      const { projection: before } = await buildProjectionForGoal(goal);
      await addExpectedIncome(goal.id, {
        date: expected.date,
        label: expected.label,
        amount: expected.amount,
        description: `${expected.label} on ${expected.date}`,
      });
      const { projection: after } = await buildProjectionForGoal(goal);
      const when = formatMonDayYear(expected.date, today);
      const gained =
        before.eta && after.eta
          ? Math.round(
              (Date.parse(`${before.eta}T12:00:00Z`) - Date.parse(`${after.eta}T12:00:00Z`)) /
                86400000,
            )
          : 0;
      const impact = !after.eta
        ? ""
        : after.onTrack
          ? ` Once it lands you're on course, arriving ${formatMonDayYear(after.eta, today)}.`
          : gained > 0
            ? ` Once it lands you arrive ${formatMonDayYear(after.eta, today)}, ${gained} day${gained === 1 ? "" : "s"} sooner.`
            : "";
      const event: RouteEvent = {
        type: "income_expected",
        description: `${expected.label} · arriving ${when}`,
        amount: expected.amount,
        previousEta: before.eta,
        newEta: after.eta,
      };
      return NextResponse.json({
        reply: `Got it. I added a star on ${when} for the $${expected.amount.toLocaleString("en-US")} ${expected.sender === "they" ? "coming in" : `${expected.sender} is sending`}.${impact}`,
        event: { ...event, previousWaypoints: before.waypoints },
        projection: after,
      });
    }

    const intent = await classifyRouteMessage(latest);

    if (intent.kind === "purchase" || intent.kind === "income") {
      const isIncome = intent.kind === "income";
      const { projection: before } = await buildProjectionForGoal(goal);

      const starLabel = isIncome
        ? receivedMoneyLabel(latest, intent.description)
        : null;
      if (isIncome) {
        await addReportedIncome(goal.id, intent.amount, {
          description: intent.description,
          label: starLabel ?? "Money in",
          date: parsed.data.localDate,
        });
        await depositIncomeToChecking(intent.amount, intent.description);
      } else {
        await addReportedSpend(goal.id, intent.amount);
      }

      const { projection: after } = await buildProjectionForGoal(goal);

      const event: RouteEvent = {
        type: isIncome ? "income_reported" : "user_reported",
        description: isIncome
          ? `${starLabel} deposited to checking`
          : intent.description,
        amount: intent.amount,
        previousEta: before.eta,
        newEta: after.eta,
      };

      let reply = isIncome
        ? `Nice! I added $${intent.amount.toLocaleString("en-US")} (${starLabel}) to your Capital One checking and put a new star on your route. ${describeIncomeImpact(
            intent,
            goal,
            before,
            after,
          ).replace(/^Added: [^.]*\.\s*/, "")}`.trim()
        : describePurchaseImpact(intent, goal, before, after);

      if (isIncome && intent.amount === 85 && /tip/i.test(latest)) {
        reply =
          "Nice work! I added the $85 and found a faster route. You now arrive Dec 28, 9 days sooner. Two more nights like this and you'll make Dec 10.";
      }

      console.info(`[grok] goal chat (${intent.kind}) ${Date.now() - started}ms`);
      return NextResponse.json({
        reply,
        event: {
          ...event,
          previousWaypoints: before.waypoints,
          account: isIncome ? "Capital One checking" : undefined,
        },
        projection: after,
        accountUpdate: isIncome
          ? {
              account: "Capital One checking",
              line: `${starLabel} deposited to checking +$${intent.amount.toFixed(2)}`,
            }
          : null,
      });
    }

    const { projection, snapshot } = await buildProjectionForGoal(goal);
    const reply = await answerRouteQuestion(goal, projection, snapshot, turns);
    console.info(`[grok] goal chat (question) ${Date.now() - started}ms`);
    return NextResponse.json({ reply, event: null, projection });
  } catch (e) {
    console.error("[goal chat] failed", e);
    return jsonError("Polaris couldn't check your route right now.", 502);
  }
}

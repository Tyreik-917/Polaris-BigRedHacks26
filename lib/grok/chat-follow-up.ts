import type { ChatMessage } from "@/lib/chat/types";
import type { Goal } from "@/lib/goals/types";
import type { FinancialSnapshot } from "@/lib/nessie/types";
import type { ProjectionResult } from "@/lib/projection/engine";
import { buildEtaCopy, formatProjectionDate } from "@/lib/projection/eta-copy";
import { xaiChatCompletion } from "./client";

export type PolarisChatContext = {
  goal: Goal;
  projection: ProjectionResult;
  snapshot: FinancialSnapshot;
  directionLines: string[];
  history: ChatMessage[];
};

function snapshotSummary(snapshot: FinancialSnapshot) {
  return {
    checkingBalance: snapshot.checkingBalance,
    savingsBalance: snapshot.savingsBalance,
    avgDailySpend: snapshot.avgDailySpend,
    avgDailyFoodSpend: snapshot.avgDailyFoodSpend,
    estimatedPaycheckAmount: snapshot.estimatedPaycheckAmount,
    paycheckIntervalDays: snapshot.paycheckIntervalDays,
    upcomingBills: snapshot.bills
      .slice()
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6)
      .map((b) => ({
        payee: b.payee,
        amount: b.amount,
        dueDate: b.dueDate,
      })),
  };
}

function heuristicAnswer(ctx: PolarisChatContext, question: string): string {
  const q = question.toLowerCase();
  const eta = ctx.projection.etaDate
    ? formatProjectionDate(ctx.projection.etaDate)
    : "unclear";
  const copy = buildEtaCopy(ctx.projection);

  if (
    q.includes("extra shift") ||
    q.includes("pick up") ||
    q.includes("more hours") ||
    q.includes("overtime")
  ) {
    const pay = ctx.snapshot.estimatedPaycheckAmount;
    const interval = ctx.snapshot.paycheckIntervalDays;
    if (pay > 0) {
      return `If an extra shift lands in your next deposit (~$${Math.round(pay)} every ${interval} days), your route usually tightens — often a few days sooner on ETA. Sync after payday hits Nessie and tap Reroute so I recalc with real numbers. Right now you're tracking ${copy.detail}`;
    }
    return `An extra shift helps once it shows up in Nessie as a deposit — then Reroute and I'll refresh your ETA. ${copy.detail}`;
  }

  if (q.includes("eta") || q.includes("arrive") || q.includes("when")) {
    return copy.detail;
  }

  if (q.includes("why") && (q.includes("change") || q.includes("shift"))) {
    return `ETA moves when Nessie balances, spending, or bills change — or when you report a purchase we haven't synced yet. Your latest ETA is ${eta}. ${ctx.directionLines[0] ?? "Check Full route for your next turn."}`;
  }

  return `I'm working from your synced Nessie data: ETA ${eta}, $${Math.round(ctx.projection.currentSaved)} saved toward $${ctx.goal.targetAmount}. ${ctx.directionLines[0] ?? copy.detail} Ask about a specific move (extra shift, cutting spend, bills) and I'll reason from those numbers.`;
}

export async function answerPolarisQuestion(
  ctx: PolarisChatContext,
  question: string,
): Promise<string> {
  const trimmed = question.trim();
  if (!trimmed) return "Ask me anything about your route — I'm here to help.";

  const system = `You are Polaris, a GPS for college finances. Answer follow-up questions using ONLY facts in the JSON context.
Rules: Short (2-4 sentences). Second person. No invented dollar amounts or dates. If you cannot estimate from data, say what to sync or reroute.
For hypotheticals (extra shift, skip coffee), explain directionally how it would affect ETA using paycheck and spend fields when present — do not claim precision you don't have.`;

  const contextPayload = {
    goal: ctx.goal,
    projection: {
      etaDate: ctx.projection.etaDate,
      onTrack: ctx.projection.onTrack,
      daysEarlyOrLate: ctx.projection.daysEarlyOrLate,
      currentSaved: ctx.projection.currentSaved,
      progressPercent: ctx.projection.progressPercent,
      avgDailySpendUsed: ctx.projection.avgDailySpendUsed,
    },
    snapshot: snapshotSummary(ctx.snapshot),
    directions: ctx.directionLines,
    recentChat: ctx.history.slice(-8).map((m) => ({
      role: m.role,
      content: m.content.slice(0, 1200),
    })),
  };

  const historyMessages = ctx.history.slice(-10).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content.slice(0, 2000),
  }));

  const raw = await xaiChatCompletion([
    { role: "system", content: system },
    {
      role: "user",
      content: `Context JSON:\n${JSON.stringify(contextPayload)}\n\nQuestion: ${trimmed}`,
    },
    ...historyMessages,
    { role: "user", content: trimmed },
  ]);

  if (!raw) return heuristicAnswer(ctx, trimmed);
  return raw;
}

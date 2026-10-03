import type { Goal } from "@/lib/goals/types";
import type { FinancialSnapshot } from "@/lib/nessie/types";
import { etaDeltaIfSavedIncreases, type ProjectionResult } from "@/lib/projection/engine";
import { isFoodPurchase, purchasesInLastDays } from "@/lib/projection/spending";

export type TipFacts = Record<string, string | number | boolean>;

export type TipCandidate = {
  id: string;
  priority: number;
  templateKey: string;
  facts: TipFacts;
};

const TEMPLATES: Record<string, (f: TipFacts) => string> = {
  bill_soon: (f) =>
    `${f.payee} posts in ${f.daysUntil} days. You're clear, with $${f.cushion} to spare after it hits.`,
  food_pace: (f) =>
    `You've spent $${f.foodSpend} on food since Monday. One more takeout this week puts you off course — cooking twice gets you back on time.`,
  receivable: (f) =>
    `${f.name} still owes you $${f.amount}. Collecting it moves your ETA up ${f.etaImpactDays} days.`,
  off_track: (f) =>
    `At your current pace, you'll reach $${f.targetAmount} on ${f.etaDate} — ${f.daysLate} days late.`,
  on_track: (f) =>
    `You're on course to arrive by ${f.targetDate}. Stay within about $${f.dailyBudget}/day on extras.`,
};

export function renderTipFallback(tip: TipCandidate): string {
  const fn = TEMPLATES[tip.templateKey];
  return fn ? fn(tip.facts) : "Keep steering toward your destination.";
}

function daysUntil(dateStr: string, ref: Date): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const r = new Date(ref);
  r.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - r.getTime()) / 86400000);
}

export function buildTips(
  goal: Goal,
  snapshot: FinancialSnapshot,
  projection: ProjectionResult,
  ref: Date = new Date(),
): TipCandidate[] {
  const tips: TipCandidate[] = [];

  const upcoming = snapshot.bills
    .map((b) => ({ bill: b, days: daysUntil(b.dueDate, ref) }))
    .filter((x) => x.days >= 0 && x.days <= 4)
    .sort((a, b) => a.days - b.days)[0];

  if (upcoming) {
    const cushion =
      Math.round(
        (snapshot.checkingBalance - upcoming.bill.amount) * 100,
      ) / 100;
    tips.push({
      id: "bill",
      priority: 1,
      templateKey: "bill_soon",
      facts: {
        payee: upcoming.bill.payee,
        daysUntil: upcoming.days,
        cushion: Math.max(cushion, 0),
      },
    });
  }

  const monday = new Date(ref);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const foodSpend = purchasesInLastDays(snapshot.purchases, 14, ref)
    .filter(isFoodPurchase)
    .filter((p) => new Date(p.date) >= monday)
    .reduce((s, p) => s + p.amount, 0);

  if (foodSpend > 0) {
    tips.push({
      id: "food",
      priority: 2,
      templateKey: "food_pace",
      facts: {
        foodSpend: Math.round(foodSpend),
      },
    });
  }

  for (const r of snapshot.receivables) {
    const etaImpactDays =
      etaDeltaIfSavedIncreases(goal, snapshot, r.amount, ref) ?? 2;
    tips.push({
      id: `recv-${r.name}`,
      priority: 3,
      templateKey: "receivable",
      facts: {
        name: r.name,
        amount: r.amount,
        etaImpactDays,
      },
    });
    break;
  }

  if (projection.etaDate && !projection.onTrack) {
    const daysLate = projection.daysEarlyOrLate
      ? Math.abs(projection.daysEarlyOrLate)
      : 0;
    tips.push({
      id: "eta",
      priority: 4,
      templateKey: "off_track",
      facts: {
        targetAmount: goal.targetAmount,
        etaDate: projection.etaDate,
        daysLate,
      },
    });
  } else if (projection.onTrack) {
    const slack =
      projection.avgDailySpendUsed > 0
        ? Math.round(projection.avgDailySpendUsed)
        : 15;
    tips.push({
      id: "ontrack",
      priority: 5,
      templateKey: "on_track",
      facts: {
        targetDate: goal.targetDate,
        dailyBudget: slack,
      },
    });
  }

  return tips.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

export function tipsToNarrationFallback(tips: TipCandidate[]): string {
  return tips.map(renderTipFallback).join("\n\n");
}

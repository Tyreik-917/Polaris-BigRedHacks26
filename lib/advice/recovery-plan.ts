import type { Goal } from "@/lib/goals/types";
import type { FinancialSnapshot, NormalizedPurchase } from "@/lib/nessie/types";
import { formatProjectionDate } from "@/lib/projection/eta-copy";
import { projectGoal, type ProjectionResult } from "@/lib/projection/engine";
import {
  isFoodPurchase,
  purchasesInLastDays,
} from "@/lib/projection/spending";

export type RecoveryMove = {
  id: string;
  text: string;
};

export type RecoveryPlan = {
  moves: RecoveryMove[];
  headline: string;
  etaIfFollowed: string | null;
  etaIfFollowedLabel: string | null;
  onTrackIfFollowed: boolean;
  targetDateLabel: string;
};

type RecoveryAdjustments = {
  extraSavings: number;
  dailySpendCut: number;
};

type RecoveryCandidate = RecoveryMove & {
  apply: (current: RecoveryAdjustments) => RecoveryAdjustments;
  priority: number;
};

const COFFEE_PATTERN = /coffee|starbucks|cafe/i;

function parsePurchaseDay(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00`);
}

function isGroceryFood(p: NormalizedPurchase): boolean {
  const blob = `${p.category ?? ""} ${p.merchantName ?? ""} ${p.description}`;
  return /grocery|wegmans|market/i.test(blob);
}

function isTakeoutPurchase(p: NormalizedPurchase): boolean {
  return isFoodPurchase(p) && !isGroceryFood(p);
}

function projectWithAdjustments(
  goal: Goal,
  snapshot: FinancialSnapshot,
  adjustments: RecoveryAdjustments,
  ref: Date,
): ProjectionResult {
  const avgDailySpend = Math.max(
    0,
    snapshot.avgDailySpend - adjustments.dailySpendCut,
  );
  const adjusted: FinancialSnapshot = {
    ...snapshot,
    savingsBalance: snapshot.savingsBalance + adjustments.extraSavings,
    avgDailySpend,
  };
  return projectGoal(goal, adjusted, ref);
}

function moveCountWord(n: number): string {
  if (n === 1) return "One move";
  if (n === 2) return "Two moves";
  if (n === 3) return "Three moves";
  return `${n} moves`;
}

function buildCandidates(
  snapshot: FinancialSnapshot,
  ref: Date,
): RecoveryCandidate[] {
  const candidates: RecoveryCandidate[] = [];

  for (const r of snapshot.receivables) {
    candidates.push({
      id: `recv-${r.name}`,
      text: `collect the $${r.amount} ${r.name} owes you`,
      priority: 1,
      apply: (cur) => ({
        ...cur,
        extraSavings: cur.extraSavings + r.amount,
      }),
    });
  }

  const monday = new Date(ref);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const takeouts = purchasesInLastDays(snapshot.purchases, 14, ref)
    .filter(isTakeoutPurchase)
    .filter((p) => parsePurchaseDay(p.date) >= monday);

  if (takeouts.length > 0) {
    const avgTakeout =
      takeouts.reduce((s, p) => s + p.amount, 0) / takeouts.length;
    const dinnerCount = Math.min(3, Math.max(2, takeouts.length));
    const savings = Math.round(avgTakeout * dinnerCount);
    const dinnerWord = dinnerCount === 1 ? "dinner" : "dinners";
    candidates.push({
      id: "cook-dinners",
      text: `cook ${dinnerCount} ${dinnerWord} this week`,
      priority: 2,
      apply: (cur) => ({
        ...cur,
        extraSavings: cur.extraSavings + savings,
      }),
    });
  }

  const coffeeRuns = purchasesInLastDays(snapshot.purchases, 14, ref).filter(
    (p) =>
      COFFEE_PATTERN.test(p.description) ||
      COFFEE_PATTERN.test(p.merchantName ?? "") ||
      COFFEE_PATTERN.test(p.category ?? ""),
  );

  if (coffeeRuns.length > 0) {
    const avgCoffee =
      coffeeRuns.reduce((s, p) => s + p.amount, 0) / coffeeRuns.length;
    const weeklyCut = Math.round(avgCoffee * 100) / 100;
    const dailyCut = weeklyCut / 7;
    candidates.push({
      id: "skip-coffee",
      text: "skip one coffee run a week",
      priority: 3,
      apply: (cur) => ({
        ...cur,
        dailySpendCut: cur.dailySpendCut + dailyCut,
      }),
    });
  }

  return candidates.sort((a, b) => a.priority - b.priority);
}

/** Few high-impact moves that restore on-time arrival when possible. */
export function buildRecoveryPlan(
  goal: Goal,
  snapshot: FinancialSnapshot,
  ref: Date = new Date(),
): RecoveryPlan | null {
  const base = projectGoal(goal, snapshot, ref);
  if (base.onTrack) return null;

  const targetDateLabel = formatProjectionDate(goal.targetDate);
  const pool = buildCandidates(snapshot, ref);
  if (pool.length === 0) return null;

  let adjustments: RecoveryAdjustments = { extraSavings: 0, dailySpendCut: 0 };
  for (const candidate of pool) {
    adjustments = candidate.apply(adjustments);
  }

  const combined = projectWithAdjustments(goal, snapshot, adjustments, ref);
  const improvesRoute =
    combined.onTrack ||
    (base.etaDate &&
      combined.etaDate &&
      combined.etaDate < base.etaDate);
  if (!improvesRoute) return null;

  const moves: RecoveryMove[] = pool.map((c) => ({
    id: c.id,
    text: c.text,
  }));

  const moveList = moves.map((m) => m.text).join(", ");
  const headline = `${moveCountWord(moves.length)} get you back to ${targetDateLabel}: ${moveList}.`;

  const etaIfFollowedLabel = combined.etaDate
    ? formatProjectionDate(combined.etaDate)
    : null;

  return {
    moves,
    headline,
    etaIfFollowed: combined.etaDate,
    etaIfFollowedLabel,
    onTrackIfFollowed: combined.onTrack,
    targetDateLabel,
  };
}

export function recoveryPlanDetail(plan: RecoveryPlan): string {
  if (!plan.etaIfFollowedLabel) {
    return "Follow these moves to tighten your route — sync again after you make progress.";
  }
  if (plan.onTrackIfFollowed) {
    return `If you follow them, you'll arrive by ${plan.targetDateLabel} — on time.`;
  }
  return `If you follow them, your ETA improves to ${plan.etaIfFollowedLabel}.`;
}

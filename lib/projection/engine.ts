import type { Goal } from "@/lib/goals/types";
import type { FinancialSnapshot, NormalizedBill } from "@/lib/nessie/types";

export type DailyPoint = {
  date: string;
  balance: number;
};

export type ProjectionResult = {
  currentSaved: number;
  targetAmount: number;
  targetDate: string;
  etaDate: string | null;
  daysEarlyOrLate: number | null;
  onTrack: boolean;
  progressPercent: number;
  dailySeries: DailyPoint[];
  avgDailySpendUsed: number;
};

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function billsDueOn(bills: NormalizedBill[], date: string): number {
  return bills
    .filter((b) => b.dueDate === date)
    .reduce((s, b) => s + b.amount, 0);
}

function depositOnDay(
  snapshot: FinancialSnapshot,
  dayIndex: number,
  start: Date,
): number {
  const { estimatedPaycheckAmount, paycheckIntervalDays } = snapshot;
  if (estimatedPaycheckAmount <= 0) return 0;
  const d = addDays(start, dayIndex);
  if (dayIndex === 0) return 0;
  const epoch = start.getTime();
  const diffDays = Math.floor(
    (d.getTime() - epoch) / (1000 * 60 * 60 * 24),
  );
  if (diffDays > 0 && diffDays % paycheckIntervalDays === 0) {
    return estimatedPaycheckAmount;
  }
  return 0;
}

export function projectGoal(
  goal: Goal,
  snapshot: FinancialSnapshot,
  ref: Date = new Date(),
): ProjectionResult {
  const currentSaved = snapshot.savingsBalance;
  const targetAmount = goal.targetAmount;
  const targetDate = goal.targetDate;
  const avgDailySpendUsed = snapshot.avgDailySpend;

  const start = new Date(ref);
  start.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const maxDays = Math.max(
    120,
    Math.ceil((target.getTime() - start.getTime()) / 86400000) + 60,
  );

  let balance = currentSaved;
  const dailySeries: DailyPoint[] = [];
  let etaDate: string | null = null;

  for (let i = 0; i <= maxDays; i++) {
    const d = addDays(start, i);
    const dateStr = isoDate(d);
    if (i > 0) {
      balance += depositOnDay(snapshot, i, start);
      balance -= billsDueOn(snapshot.bills, dateStr);
      balance -= avgDailySpendUsed;
    }
    dailySeries.push({ date: dateStr, balance: Math.round(balance * 100) / 100 });
    if (etaDate == null && balance >= targetAmount) {
      etaDate = dateStr;
    }
  }

  let daysEarlyOrLate: number | null = null;
  let onTrack = false;
  if (etaDate) {
    const eta = new Date(etaDate);
    daysEarlyOrLate = Math.round(
      (target.getTime() - eta.getTime()) / 86400000,
    );
    onTrack = daysEarlyOrLate >= 0;
  }

  const progressPercent = Math.min(
    1,
    Math.max(0, currentSaved / targetAmount),
  );

  return {
    currentSaved,
    targetAmount,
    targetDate,
    etaDate,
    daysEarlyOrLate,
    onTrack,
    progressPercent,
    dailySeries,
    avgDailySpendUsed,
  };
}

/** Re-run ETA if extra savings land (e.g. collecting a receivable). */
export function etaDeltaIfSavedIncreases(
  goal: Goal,
  snapshot: FinancialSnapshot,
  extra: number,
  ref: Date = new Date(),
): number | null {
  const base = projectGoal(goal, snapshot, ref);
  const bumped: FinancialSnapshot = {
    ...snapshot,
    savingsBalance: snapshot.savingsBalance + extra,
  };
  const next = projectGoal(goal, bumped, ref);
  if (!base.etaDate || !next.etaDate) return null;
  const b = new Date(base.etaDate).getTime();
  const n = new Date(next.etaDate).getTime();
  return Math.round((b - n) / 86400000);
}

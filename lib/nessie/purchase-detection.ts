import type { Goal } from "@/lib/goals/types";
import { projectGoal } from "@/lib/projection/engine";
import { formatCheckInMoney } from "@/lib/nessie/check-in";
import type { FinancialSnapshot, NormalizedPurchase } from "@/lib/nessie/types";

export function purchaseDisplayName(p: NormalizedPurchase): string {
  return (p.merchantName?.trim() || p.description.trim() || "Purchase").slice(
    0,
    48,
  );
}

/** Example: "−$32.40" */
export function formatPurchaseDelta(amount: number): string {
  const formatted = formatCheckInMoney(Math.abs(amount));
  return `−${formatted}`;
}

export function formatPurchaseDetectionLine(p: NormalizedPurchase): string {
  return `New purchase detected · ${purchaseDisplayName(p)} · ${formatPurchaseDelta(p.amount)}`;
}

/** Stable compare for Nessie poll — ignores fetchedAt. */
export function financialSnapshotSignature(s: FinancialSnapshot): string {
  const purchaseIds = s.purchases
    .map((p) => p.id)
    .sort()
    .join(",");
  const billSig = s.bills
    .map((b) => `${b.id}:${b.amount}:${b.dueDate}`)
    .sort()
    .join("|");
  return [
    s.checkingBalance,
    s.savingsBalance,
    s.avgDailySpend.toFixed(4),
    purchaseIds,
    billSig,
  ].join("~");
}

export function findNewPurchases(
  previous: FinancialSnapshot | null,
  next: FinancialSnapshot,
): NormalizedPurchase[] {
  if (!previous) return [];
  const known = new Set(previous.purchases.map((p) => p.id));
  return next.purchases
    .filter((p) => p.id && !known.has(p.id))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export function projectionRouteFingerprint(
  goal: Goal,
  snapshot: FinancialSnapshot,
  ref: Date = new Date(),
): string {
  const p = projectGoal(goal, snapshot, ref);
  return [
    p.etaDate ?? "",
    p.onTrack ? "1" : "0",
    p.daysEarlyOrLate ?? "",
    p.avgDailySpendUsed.toFixed(4),
  ].join("|");
}

export function purchaseAffectsRoute(
  goal: Goal,
  before: FinancialSnapshot,
  after: FinancialSnapshot,
  ref: Date = new Date(),
): boolean {
  const beforeFp = projectionRouteFingerprint(goal, before, ref);
  const afterFp = projectionRouteFingerprint(goal, after, ref);
  return beforeFp !== afterFp;
}

export function pickRouteAffectingPurchase(
  goal: Goal,
  previous: FinancialSnapshot,
  next: FinancialSnapshot,
  newcomers: NormalizedPurchase[],
  ref: Date = new Date(),
): NormalizedPurchase | null {
  if (newcomers.length === 0) return null;
  if (!purchaseAffectsRoute(goal, previous, next, ref)) return null;
  return newcomers[0] ?? null;
}

import type { FinancialSnapshot, NormalizedPurchase } from "@/lib/nessie/types";
import type { UserReportedSpend } from "./types";

/** Nessie caught up — drop reports that match an existing purchase. */
export function nessieAlreadyShowsSpend(
  report: UserReportedSpend,
  purchases: NormalizedPurchase[],
): boolean {
  return purchases.some(
    (p) =>
      p.id &&
      p.date === report.date &&
      Math.abs(p.amount - report.amount) < 0.02,
  );
}

export function activeUserReports(
  snapshot: FinancialSnapshot,
  reports: UserReportedSpend[],
): UserReportedSpend[] {
  return reports.filter((r) => !nessieAlreadyShowsSpend(r, snapshot.purchases));
}

/**
 * Fold user-reported spending Nessie has not posted yet into the snapshot
 * used for projection and directions (one-time outflow + checking adjustment).
 */
export function applyUserReportsToSnapshot(
  snapshot: FinancialSnapshot,
  reports: UserReportedSpend[],
): FinancialSnapshot {
  const pending = activeUserReports(snapshot, reports);
  if (pending.length === 0) return snapshot;

  const pendingTotal = pending.reduce((s, r) => s + r.amount, 0);

  const checkingBalance = Math.max(
    0,
    Math.round((snapshot.checkingBalance - pendingTotal) * 100) / 100,
  );
  const totalLiquid = Math.max(
    0,
    Math.round((checkingBalance + snapshot.savingsBalance) * 100) / 100,
  );

  return {
    ...snapshot,
    checkingBalance,
    totalLiquid,
    initialSpendAdjustment: pendingTotal,
  };
}

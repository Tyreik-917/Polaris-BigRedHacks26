import type { FinancialSnapshot, NormalizedBill } from "@/lib/nessie/types";
import type { SeedIds } from "@/lib/types";

export type BillTemplate = {
  id: string;
  payee: string;
  amount: number;
  dayOfMonth: number;
};

export type ProjectionSnapshot = {
  checkingBalance: number;
  savingsBalance: number;
  bills: BillTemplate[];
  paycheckAmount: number;
  paycheckIntervalDays: number;
  /** Most recent deposit date — anchors biweekly pay schedule. */
  paycheckAnchorDate: string | null;
  dailySpend: number;
  weeklyFoodSpend: number;
  coffeePurchasesPerWeek: number;
  receivableAmount: number;
  receivableLabel: string;
  samCustomerId?: string;
  samCheckingAccountId?: string;
  /** One-off spend not on Nessie (user reports). */
  reportedSpendTotal: number;
  seedIds?: SeedIds;
};

function dayOfMonthFromBill(b: NormalizedBill): number {
  const d = new Date(`${b.dueDate}T12:00:00`);
  const day = d.getUTCDate();
  return Number.isFinite(day) ? day : 1;
}

export function billTemplatesFromFinancial(
  bills: NormalizedBill[],
): BillTemplate[] {
  const byKey = new Map<string, BillTemplate>();
  for (const b of bills) {
    const key = `${b.payee}:${b.amount}:${dayOfMonthFromBill(b)}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        id: b.id || key,
        payee: b.payee,
        amount: b.amount,
        dayOfMonth: dayOfMonthFromBill(b),
      });
    }
  }
  return [...byKey.values()];
}

function coffeePurchasesPerWeek(snapshot: FinancialSnapshot): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return snapshot.purchases.filter(
    (p) =>
      p.date >= cutoffStr &&
      /coffee|starbucks|espresso|cafe/i.test(
        `${p.merchantName ?? ""} ${p.description}`,
      ),
  ).length;
}

export function projectionSnapshotFromFinancial(
  snapshot: FinancialSnapshot,
  opts: {
    reportedSpendTotal?: number;
    seedIds?: SeedIds;
  } = {},
): ProjectionSnapshot {
  const receivable = snapshot.receivables[0];
  const weeklyFood =
    snapshot.avgDailyFoodSpend > 0
      ? snapshot.avgDailyFoodSpend * 7
      : snapshot.avgDailySpend * 7 * 0.6;

  const deposits = [...snapshot.deposits].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return {
    checkingBalance: snapshot.checkingBalance,
    savingsBalance: snapshot.savingsBalance,
    bills: billTemplatesFromFinancial(snapshot.bills),
    paycheckAmount: snapshot.estimatedPaycheckAmount,
    paycheckIntervalDays: snapshot.paycheckIntervalDays,
    paycheckAnchorDate: deposits[0]?.date ?? null,
    dailySpend: snapshot.avgDailySpend,
    weeklyFoodSpend: weeklyFood,
    coffeePurchasesPerWeek: coffeePurchasesPerWeek(snapshot),
    receivableAmount: receivable?.amount ?? 0,
    receivableLabel: receivable?.name ?? "Sam",
    samCustomerId: opts.seedIds?.sam.customerId,
    samCheckingAccountId: opts.seedIds?.sam.checkingAccountId,
    reportedSpendTotal:
      opts.reportedSpendTotal ?? snapshot.initialSpendAdjustment ?? 0,
    seedIds: opts.seedIds,
  };
}

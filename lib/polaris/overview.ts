import type { FinancialSnapshot } from "@/lib/nessie/types";
import type { Overview } from "@/lib/types";

function expandBillOccurrencesBefore(
  snapshot: FinancialSnapshot,
  targetDate: string,
  todayIso: string,
): number {
  let total = 0;
  const end = new Date(`${targetDate}T12:00:00`);
  const start = new Date(`${todayIso}T12:00:00`);

  for (const bill of snapshot.bills) {
    const due = new Date(`${bill.dueDate.slice(0, 10)}T12:00:00`);
    const dayOfMonth = due.getDate();
    let cursor = new Date(start);
    cursor.setDate(dayOfMonth);
    if (cursor < start) cursor.setMonth(cursor.getMonth() + 1);

    while (cursor <= end) {
      if (cursor >= start) total += bill.amount;
      cursor = new Date(cursor);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return Math.round(total * 100) / 100;
}

export function buildOverview(
  snapshot: FinancialSnapshot,
  targetDate: string,
  today: Date = new Date(),
): Overview {
  const todayIso = today.toISOString().slice(0, 10);
  const weeklyFoodSpend =
    snapshot.avgDailyFoodSpend > 0
      ? snapshot.avgDailyFoodSpend * 7
      : snapshot.avgDailySpend * 7;

  return {
    checking: snapshot.checkingBalance,
    savings: snapshot.savingsBalance,
    billsBeforeTarget: expandBillOccurrencesBefore(
      snapshot,
      targetDate,
      todayIso,
    ),
    foodSpending: Math.round(weeklyFoodSpend * 100) / 100,
    paycheckIntervalLabel:
      snapshot.paycheckIntervalDays === 14
        ? "Every other Fri"
        : `Every ${snapshot.paycheckIntervalDays} days`,
    paycheckAmount: snapshot.estimatedPaycheckAmount,
  };
}

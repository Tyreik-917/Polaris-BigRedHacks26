import type { FinancialSnapshot, NormalizedBill } from "./types";

export type FinancialCheckInSummary = {
  billHorizonDate: string;
  billsBeforeTotal: number;
  upcomingBills: NormalizedBill[];
  foodPerWeek: number;
  receivablesTotal: number;
  oneLiner: string;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatCheckInMoney(n: number): string {
  const hasCents = Math.abs(n - Math.round(n)) > 0.001;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
}

export function formatCheckInHorizon(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Bills with due dates from today through horizon (inclusive), excluding past-due. */
export function billsDueThrough(
  bills: NormalizedBill[],
  horizonDate: string,
  ref: Date = new Date(),
): NormalizedBill[] {
  const today = isoDate(ref);
  const horizon = horizonDate.slice(0, 10);
  return bills.filter(
    (b) => b.dueDate >= today && b.dueDate <= horizon,
  );
}

export function defaultBillHorizon(ref: Date = new Date()): string {
  const d = new Date(ref);
  d.setDate(d.getDate() + 30);
  return isoDate(d);
}

export function resolveBillHorizon(
  goalTargetDate?: string,
  ref: Date = new Date(),
): string {
  const today = isoDate(ref);
  if (goalTargetDate) {
    const target = goalTargetDate.slice(0, 10);
    if (target >= today) return target;
  }
  return defaultBillHorizon(ref);
}

export function buildFinancialCheckIn(
  snapshot: FinancialSnapshot,
  options?: { goalTargetDate?: string; ref?: Date },
): FinancialCheckInSummary {
  const ref = options?.ref ?? new Date();
  const billHorizonDate = resolveBillHorizon(options?.goalTargetDate, ref);
  const upcomingBills = billsDueThrough(snapshot.bills, billHorizonDate, ref);
  const billsBeforeTotal = upcomingBills.reduce((s, b) => s + b.amount, 0);
  const foodPerWeek = snapshot.avgDailyFoodSpend * 7;
  const receivablesTotal = snapshot.receivables.reduce(
    (s, r) => s + r.amount,
    0,
  );

  const horizonLabel = formatCheckInHorizon(billHorizonDate);
  const parts = [
    `Checking ${formatCheckInMoney(snapshot.checkingBalance)}`,
    `Savings ${formatCheckInMoney(snapshot.savingsBalance)}`,
    `Bills before ${horizonLabel}: ${formatCheckInMoney(billsBeforeTotal)}`,
    `Food: ${formatCheckInMoney(foodPerWeek)}/week`,
  ];
  if (receivablesTotal > 0) {
    parts.push(`Owed to you: ${formatCheckInMoney(receivablesTotal)}`);
  }

  return {
    billHorizonDate,
    billsBeforeTotal,
    upcomingBills,
    foodPerWeek,
    receivablesTotal,
    oneLiner: parts.join(" · "),
  };
}

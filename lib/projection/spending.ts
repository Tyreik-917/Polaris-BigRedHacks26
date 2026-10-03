import type { NormalizedPurchase } from "@/lib/nessie/types";

const FOOD_PATTERN =
  /food|restaurant|cafe|coffee|dining|grocery|pizza|takeout|chipotle|starbucks/i;

export function isFoodPurchase(p: NormalizedPurchase): boolean {
  if (p.category && FOOD_PATTERN.test(p.category)) return true;
  if (p.merchantName && FOOD_PATTERN.test(p.merchantName)) return true;
  return FOOD_PATTERN.test(p.description);
}

export function purchasesInLastDays(
  purchases: NormalizedPurchase[],
  days: number,
  ref: Date = new Date(),
): NormalizedPurchase[] {
  const start = new Date(ref);
  start.setDate(start.getDate() - days);
  return purchases.filter((p) => {
    const d = new Date(p.date);
    return d >= start && d <= ref;
  });
}

export function averageDailySpend(
  purchases: NormalizedPurchase[],
  days: number,
  ref: Date = new Date(),
): number {
  const recent = purchasesInLastDays(purchases, days, ref);
  const total = recent.reduce((s, p) => s + p.amount, 0);
  return total / days;
}

export function averageDailyFoodSpend(
  purchases: NormalizedPurchase[],
  days: number,
  ref: Date = new Date(),
): number {
  const recent = purchasesInLastDays(purchases, days, ref).filter(isFoodPurchase);
  const total = recent.reduce((s, p) => s + p.amount, 0);
  return total / days;
}

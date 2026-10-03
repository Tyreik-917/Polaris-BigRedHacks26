import type { Goal } from "@/lib/goals/types";
import type { FinancialSnapshot, NormalizedPurchase } from "@/lib/nessie/types";
import { describe, expect, it } from "vitest";
import {
  findNewPurchases,
  formatPurchaseDetectionLine,
  pickRouteAffectingPurchase,
  purchaseAffectsRoute,
} from "./purchase-detection";

const goal: Goal = {
  label: "Trip",
  targetAmount: 500,
  targetDate: "2026-06-01",
  constellationId: "ursa-minor",
};

const ref = new Date("2025-10-03T12:00:00.000Z");

function snap(
  overrides: Partial<FinancialSnapshot> & { purchases?: NormalizedPurchase[] },
): FinancialSnapshot {
  return {
    fetchedAt: "2025-10-03T12:00:00.000Z",
    customerId: "c1",
    checkingBalance: 200,
    savingsBalance: 150,
    totalLiquid: 350,
    bills: [],
    purchases: [],
    deposits: [{ id: "d1", amount: 400, date: "2025-09-27" }],
    transfers: [],
    receivables: [],
    avgDailySpend: 12,
    avgDailyFoodSpend: 8,
    estimatedPaycheckAmount: 400,
    paycheckIntervalDays: 14,
    ...overrides,
  };
}

describe("findNewPurchases", () => {
  it("returns purchases present only in the newer snapshot", () => {
    const prev = snap({
      purchases: [
        {
          id: "p1",
          amount: 10,
          date: "2025-10-02",
          description: "Old",
        },
      ],
    });
    const next = snap({
      purchases: [
        {
          id: "p1",
          amount: 10,
          date: "2025-10-02",
          description: "Old",
        },
        {
          id: "p2",
          amount: 32.4,
          date: "2025-10-03",
          description: "Chipotle",
          merchantName: "Chipotle",
        },
      ],
    });
    const found = findNewPurchases(prev, next);
    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe("p2");
  });
});

describe("formatPurchaseDetectionLine", () => {
  it("matches the product example shape", () => {
    const line = formatPurchaseDetectionLine({
      id: "x",
      amount: 32.4,
      date: "2025-10-03",
      description: "Chipotle",
      merchantName: "Chipotle",
    });
    expect(line).toBe("New purchase detected · Chipotle · −$32.40");
  });
});

describe("purchaseAffectsRoute", () => {
  it("detects when avg spend shift changes ETA", () => {
    const before = snap({ avgDailySpend: 8 });
    const after = snap({
      avgDailySpend: 22,
      checkingBalance: 168,
      purchases: [
        {
          id: "new",
          amount: 32.4,
          date: "2025-10-03",
          description: "Chipotle",
          merchantName: "Chipotle",
        },
      ],
    });
    expect(purchaseAffectsRoute(goal, before, after, ref)).toBe(true);
  });

  it("returns false when projection is unchanged", () => {
    const before = snap({ avgDailySpend: 12 });
    const after = snap({
      avgDailySpend: 12,
      checkingBalance: before.checkingBalance,
    });
    expect(purchaseAffectsRoute(goal, before, after, ref)).toBe(false);
  });
});

describe("pickRouteAffectingPurchase", () => {
  it("returns the newest purchase when the route changes", () => {
    const prev = snap({ avgDailySpend: 8 });
    const newcomer: NormalizedPurchase = {
      id: "p-new",
      amount: 32.4,
      date: "2025-10-03",
      description: "Chipotle",
      merchantName: "Chipotle",
    };
    const next = snap({
      avgDailySpend: 22,
      checkingBalance: 168,
      purchases: [newcomer],
    });
    const picked = pickRouteAffectingPurchase(goal, prev, next, [newcomer], ref);
    expect(picked?.merchantName).toBe("Chipotle");
  });
});

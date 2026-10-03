import type { Goal } from "@/lib/goals/types";
import type { FinancialSnapshot } from "@/lib/nessie/types";
import { describe, expect, it } from "vitest";
import { projectGoal } from "./engine";

const baseSnapshot: FinancialSnapshot = {
  fetchedAt: "2025-10-03T12:00:00.000Z",
  customerId: "test",
  checkingBalance: 300,
  savingsBalance: 100,
  totalLiquid: 400,
  bills: [],
  purchases: [],
  deposits: [
    { id: "d1", amount: 200, date: "2025-09-20" },
    { id: "d2", amount: 200, date: "2025-10-04" },
  ],
  transfers: [],
  receivables: [],
  avgDailySpend: 10,
  avgDailyFoodSpend: 5,
  estimatedPaycheckAmount: 200,
  paycheckIntervalDays: 14,
};

const goal: Goal = {
  label: "Test",
  targetAmount: 400,
  targetDate: "2025-12-15",
  constellationId: "ursa-minor",
};

describe("projectGoal", () => {
  it("starts from savings balance", () => {
    const ref = new Date("2025-10-03T12:00:00.000Z");
    const result = projectGoal(goal, baseSnapshot, ref);
    expect(result.currentSaved).toBe(100);
    expect(result.progressPercent).toBeCloseTo(0.25, 2);
  });

  it("finds an ETA when income outpaces spend", () => {
    const ref = new Date("2025-10-03T12:00:00.000Z");
    const result = projectGoal(goal, baseSnapshot, ref);
    expect(result.etaDate).not.toBeNull();
    expect(result.dailySeries.length).toBeGreaterThan(1);
  });

  it("flags late when bills and spend dominate", () => {
    const ref = new Date("2025-10-03T12:00:00.000Z");
    const heavy: FinancialSnapshot = {
      ...baseSnapshot,
      savingsBalance: 50,
      avgDailySpend: 40,
      bills: [
        {
          id: "b1",
          payee: "Rent",
          amount: 500,
          dueDate: "2025-10-05",
        },
      ],
    };
    const result = projectGoal(goal, heavy, ref);
    expect(result.onTrack).toBe(false);
  });
});

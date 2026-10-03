import { describe, expect, it } from "vitest";
import type { Goal } from "@/lib/types";
import type { ProjectionSnapshot } from "@/lib/projection-snapshot";
import { project, projectWithExtraSpend } from "@/lib/projection";

const today = new Date("2025-10-03T12:00:00Z");

const baseSnapshot: ProjectionSnapshot = {
  checkingBalance: 400,
  savingsBalance: 150,
  bills: [
    { id: "rent", payee: "Rent", amount: 200, dayOfMonth: 5 },
    { id: "phone", payee: "Phone", amount: 45, dayOfMonth: 12 },
  ],
  paycheckAmount: 380,
  paycheckIntervalDays: 14,
  paycheckAnchorDate: "2025-09-27",
  dailySpend: 5,
  weeklyFoodSpend: 25,
  coffeePurchasesPerWeek: 1,
  receivableAmount: 0,
  receivableLabel: "Sam",
  reportedSpendTotal: 0,
};

function goal(over: Partial<Goal> = {}): Goal {
  return {
    id: "g1",
    customerId: "cust",
    name: "Flight home",
    targetAmount: 400,
    targetDate: "2025-12-15",
    savingsAccountId: "sav",
    createdAt: "2025-10-01T00:00:00.000Z",
    ...over,
  };
}

describe("project", () => {
  it("on-track goal reaches target before deadline", () => {
    const g = goal({ targetDate: "2026-06-01", targetAmount: 300 });
    const result = project(g, baseSnapshot, today);
    expect(result.eta).not.toBeNull();
    expect(result.onTrack).toBe(true);
    expect(result.daysLate).toBeLessThanOrEqual(0);
  });

  it("late goal finishes after the target date", () => {
    const maya: ProjectionSnapshot = {
      checkingBalance: 612.4,
      savingsBalance: 112,
      bills: [
        { id: "rent", payee: "Rent", amount: 450, dayOfMonth: 5 },
        { id: "phone", payee: "Phone", amount: 45, dayOfMonth: 12 },
      ],
      paycheckAmount: 380,
      paycheckIntervalDays: 14,
      paycheckAnchorDate: "2025-09-26",
      dailySpend: 45 / 21,
      weeklyFoodSpend: 45,
      coffeePurchasesPerWeek: 3,
      receivableAmount: 25,
      receivableLabel: "Sam",
      reportedSpendTotal: 0,
    };
    const g = goal({ targetDate: "2025-12-15", targetAmount: 1020 });
    const result = project(g, maya, today);
    expect(result.eta).not.toBeNull();
    expect(result.eta! > g.targetDate).toBe(true);
    expect(result.onTrack).toBe(false);
    expect(result.daysLate).toBeGreaterThan(0);
  });

  it("unreachable goal returns null eta within horizon", () => {
    const g = goal({ targetAmount: 50_000 });
    const broke: ProjectionSnapshot = {
      ...baseSnapshot,
      checkingBalance: 50,
      savingsBalance: 20,
      dailySpend: 40,
      paycheckAmount: 0,
    };
    const result = project(g, broke, today);
    expect(result.eta).toBeNull();
    expect(result.onTrack).toBe(false);
  });

  it("new $32 purchase makes ETA later", () => {
    const maya: ProjectionSnapshot = {
      checkingBalance: 612.4,
      savingsBalance: 112,
      bills: [
        { id: "rent", payee: "Rent", amount: 450, dayOfMonth: 5 },
        { id: "phone", payee: "Phone", amount: 45, dayOfMonth: 12 },
      ],
      paycheckAmount: 380,
      paycheckIntervalDays: 14,
      paycheckAnchorDate: "2025-09-26",
      dailySpend: 45 / 21,
      weeklyFoodSpend: 45,
      coffeePurchasesPerWeek: 3,
      receivableAmount: 25,
      receivableLabel: "Sam",
      reportedSpendTotal: 0,
    };
    const g = goal({ targetAmount: 795, targetDate: "2025-12-15" });
    const before = project(g, maya, today);
    const after = projectWithExtraSpend(g, maya, 32, today);
    expect(before.eta).not.toBeNull();
    expect(after.eta).not.toBeNull();
    expect(after.daysLate).toBeGreaterThan(before.daysLate);
  });
});

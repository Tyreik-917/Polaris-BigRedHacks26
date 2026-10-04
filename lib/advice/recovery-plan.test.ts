import type { Goal } from "@/lib/goals/types";
import type { FinancialSnapshot } from "@/lib/nessie/types";
import { describe, expect, it } from "vitest";
import { projectGoal } from "@/lib/projection/engine";
import {
  buildRecoveryPlan,
  recoveryPlanDetail,
} from "./recovery-plan";

const goal: Goal = {
  label: "Flight home",
  targetAmount: 400,
  targetDate: "2025-11-01",
  constellationId: "ursa-minor",
};

const ref = new Date("2025-10-03T12:00:00.000Z");

/** Off-track finances (legacy engine fixture — independent of storyboard snapshot). */
const lateSnapshot: FinancialSnapshot = {
  fetchedAt: "2025-10-03T12:00:00.000Z",
  customerId: "test",
  checkingBalance: 300,
  savingsBalance: 100,
  totalLiquid: 400,
  bills: [],
  deposits: [
    { id: "d1", amount: 200, date: "2025-09-20" },
    { id: "d2", amount: 200, date: "2025-10-04" },
  ],
  transfers: [],
  receivables: [{ name: "Sam", amount: 25, note: "Split" }],
  avgDailySpend: 10,
  avgDailyFoodSpend: 8,
  estimatedPaycheckAmount: 200,
  paycheckIntervalDays: 14,
  purchases: [
    {
      id: "p-chipotle",
      amount: 14,
      date: "2025-10-02",
      description: "Chipotle",
      merchantName: "Chipotle",
      category: "Restaurant",
    },
    {
      id: "p-chipotle2",
      amount: 14,
      date: "2025-10-01",
      description: "Chipotle",
      merchantName: "Chipotle",
      category: "Restaurant",
    },
    {
      id: "p-coffee",
      amount: 5,
      date: "2025-10-02",
      description: "Coffee",
      merchantName: "Starbucks",
      category: "Food",
    },
    {
      id: "p-coffee2",
      amount: 5,
      date: "2025-10-01",
      description: "Coffee",
      merchantName: "Starbucks",
      category: "Food",
    },
    {
      id: "p-coffee3",
      amount: 5,
      date: "2025-09-30",
      description: "Coffee",
      merchantName: "Starbucks",
      category: "Food",
    },
  ],
};

describe("buildRecoveryPlan", () => {
  it("only runs when the route is late", () => {
    expect(projectGoal(goal, lateSnapshot, ref).onTrack).toBe(false);
  });

  it("matches hackathon recovery example copy", () => {
    const plan = buildRecoveryPlan(goal, lateSnapshot, ref);
    expect(plan).not.toBeNull();
    expect(plan!.moves).toHaveLength(3);
    expect(plan!.moves.length).toBeGreaterThanOrEqual(2);
    expect(plan!.headline).toContain("Sam");
    expect(recoveryPlanDetail(plan!)).toMatch(/on time|improves/i);
  });

  it("returns null when already on track", () => {
    const rich: FinancialSnapshot = {
      ...lateSnapshot,
      savingsBalance: 380,
      avgDailySpend: 2,
    };
    const plan = buildRecoveryPlan(goal, rich, ref);
    expect(plan).toBeNull();
  });
});

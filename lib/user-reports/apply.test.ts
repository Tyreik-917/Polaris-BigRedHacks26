import type { FinancialSnapshot } from "@/lib/nessie/types";
import { projectGoal } from "@/lib/projection/engine";
import type { Goal } from "@/lib/goals/types";
import { describe, expect, it } from "vitest";
import { applyUserReportsToSnapshot } from "./apply";
import { createUserReportedSpend } from "./types";

const baseSnapshot: FinancialSnapshot = {
  fetchedAt: "2025-10-03T12:00:00.000Z",
  customerId: "test",
  checkingBalance: 300,
  savingsBalance: 200,
  totalLiquid: 500,
  bills: [],
  purchases: [],
  deposits: [],
  transfers: [],
  receivables: [],
  avgDailySpend: 10,
  avgDailyFoodSpend: 4,
  estimatedPaycheckAmount: 0,
  paycheckIntervalDays: 14,
};

const goal: Goal = {
  label: "Trip",
  targetAmount: 500,
  targetDate: "2026-06-01",
  constellationId: "ursa-minor",
};

describe("applyUserReportsToSnapshot", () => {
  it("raises daily spend and one-time adjustment for user reports", () => {
    const ref = new Date("2025-10-03T12:00:00.000Z");
    const report = createUserReportedSpend({
      amount: 85,
      description: "textbook",
      date: "2025-10-03",
    });
    const adjusted = applyUserReportsToSnapshot(baseSnapshot, [report]);
    expect(adjusted.checkingBalance).toBe(215);
    expect(adjusted.avgDailySpend).toBe(10);
    expect(adjusted.initialSpendAdjustment).toBe(85);

    const baseProj = projectGoal(goal, baseSnapshot, ref);
    const adjProj = projectGoal(goal, adjusted, ref);
    expect(adjProj.dailySeries[0]?.balance).toBeLessThan(
      baseProj.dailySeries[0]?.balance ?? 0,
    );
  });

  it("drops reports once Nessie shows the same purchase", () => {
    const report = createUserReportedSpend({
      amount: 85,
      description: "textbook",
      date: "2025-10-03",
    });
    const withNessie: FinancialSnapshot = {
      ...baseSnapshot,
      purchases: [
        {
          id: "nessie-1",
          amount: 85,
          date: "2025-10-03",
          description: "Campus bookstore",
        },
      ],
    };
    const adjusted = applyUserReportsToSnapshot(withNessie, [report]);
    expect(adjusted).toBe(withNessie);
  });
});

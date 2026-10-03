import { describe, expect, it } from "vitest";
import type { FinancialSnapshot } from "./types";
import {
  billsDueThrough,
  buildFinancialCheckIn,
  resolveBillHorizon,
} from "./check-in";

const base: FinancialSnapshot = {
  fetchedAt: "2025-10-03T12:00:00.000Z",
  customerId: "demo",
  checkingBalance: 612.4,
  savingsBalance: 112,
  totalLiquid: 724.4,
  bills: [
    {
      id: "b1",
      payee: "Rent",
      amount: 650,
      dueDate: "2025-10-07",
    },
    {
      id: "b2",
      payee: "Phone",
      amount: 45,
      dueDate: "2025-10-12",
    },
    {
      id: "b3",
      payee: "Later",
      amount: 100,
      dueDate: "2025-12-20",
    },
  ],
  purchases: [],
  deposits: [],
  transfers: [],
  receivables: [{ name: "Sam", amount: 25, note: "Tickets" }],
  avgDailySpend: 10,
  avgDailyFoodSpend: 45 / 7,
  estimatedPaycheckAmount: 450,
  paycheckIntervalDays: 14,
};

describe("billsDueThrough", () => {
  it("includes bills due on or before horizon after today", () => {
    const ref = new Date("2025-10-03T12:00:00.000Z");
    const due = billsDueThrough(base.bills, "2025-12-15", ref);
    expect(due.map((b) => b.id)).toEqual(["b1", "b2"]);
  });
});

describe("resolveBillHorizon", () => {
  it("uses goal target date when in the future", () => {
    const ref = new Date("2025-10-03T12:00:00.000Z");
    expect(resolveBillHorizon("2025-12-15", ref)).toBe("2025-12-15");
  });
});

describe("buildFinancialCheckIn", () => {
  it("builds the demo one-liner shape", () => {
    const ref = new Date("2025-10-03T12:00:00.000Z");
    const summary = buildFinancialCheckIn(base, {
      goalTargetDate: "2025-12-15",
      ref,
    });
    expect(summary.billsBeforeTotal).toBe(695);
    expect(summary.foodPerWeek).toBeCloseTo(45, 1);
    expect(summary.oneLiner).toContain("Checking $612.40");
    expect(summary.oneLiner).toContain("Savings $112");
    expect(summary.oneLiner).toContain("Bills before Dec 15:");
    expect(summary.oneLiner).toContain("Food: $45/week");
    expect(summary.oneLiner).toContain("Owed to you: $25");
  });
});

import { describe, expect, it, beforeEach } from "vitest";
import {
  addFixtureIncome,
  fixtureGoal,
  fixtureProjectionForIncome,
  resetFixtureScenario,
} from "@/lib/fixtures";
import type { GoalAdjustments } from "@/lib/goals/store";
import { enrichWaypointsForMap } from "@/lib/map-coords";
import type { FinancialSnapshot } from "@/lib/nessie/types";
import { parseReceivedMoney } from "@/lib/polaris/received-money";
import { projectSavingsRoute } from "@/lib/polaris/savings-route-projection";

describe("parseReceivedMoney", () => {
  it.each([
    ["I made $85 in tips at work tonight!", 85, "Tips"],
    ["My mom sent me $50 for groceries", 50, "From Mom"],
    ["Sam venmo'd me $20 for the Uber", 20, "From Sam"],
    ["got $200 from my grandma", 200, "From Grandma"],
    ["I got paid $380 today", 380, "Paycheck"],
    ["Amazon refunded me $30", 30, "Refund"],
    ["I sold my old calculator for $40", 40, "Sale"],
    ["Picked up an extra shift, made $120", 120, "Extra shift"],
  ])("parses %j", (text, amount, label) => {
    expect(parseReceivedMoney(text)).toMatchObject({ amount, label });
  });

  it.each([
    "Can I get $20 from Sam?",
    "I spent $30 on a textbook",
    "I got paid today",
  ])("ignores %j", (text) => {
    expect(parseReceivedMoney(text)).toBeNull();
  });
});

const snapshot: FinancialSnapshot = {
  fetchedAt: "2026-10-03T12:00:00Z",
  customerId: "maya",
  checkingBalance: 612.4,
  savingsBalance: 112,
  totalLiquid: 724.4,
  bills: [
    { id: "rent", payee: "Rent", amount: 450, dueDate: "2026-11-05", recurring: true },
  ],
  purchases: [],
  deposits: [],
  transfers: [],
  receivables: [],
  avgDailySpend: 6.43,
  avgDailyFoodSpend: 6.43,
  estimatedPaycheckAmount: 380,
  paycheckIntervalDays: 14,
};

const goal = { ...fixtureGoal, createdAt: "2026-10-03T12:00:00.000Z" };
const today = new Date("2026-10-03T16:00:00Z");

function withIncome(
  events: { amount: number; label: string; date?: string }[],
): GoalAdjustments {
  return {
    reportedSpendTotal: 0,
    reportedIncomeTotal: events.reduce((s, e) => s + e.amount, 0),
    incomeEvents: events.map((e) => ({
      date: e.date ?? "2026-10-03",
      label: e.label,
      amount: e.amount,
      description: e.label,
    })),
    extraBills: [],
  };
}

describe("receiving money adds a star to the route (live projection)", () => {
  it("adds one lit, reported star per amount received", () => {
    const before = projectSavingsRoute(goal, snapshot, withIncome([]), today);
    const after = projectSavingsRoute(
      goal,
      snapshot,
      withIncome([{ amount: 85, label: "Tips" }]),
      today,
    );

    expect(before.waypoints.some((w) => w.reported)).toBe(false);
    expect(after.waypoints).toContainEqual(
      expect.objectContaining({
        label: "Tips",
        amount: 85,
        kind: "income",
        status: "passed",
        reported: true,
      }),
    );
  });

  it("keeps two same-day deposits with the same label as two stars", () => {
    const after = projectSavingsRoute(
      goal,
      snapshot,
      withIncome([
        { amount: 85, label: "Tips" },
        { amount: 40, label: "Tips" },
      ]),
      today,
    );
    expect(after.waypoints.filter((w) => w.reported)).toHaveLength(2);
  });

  it("moves the demo ETA sooner for every dollar received ($85 → 9 days)", () => {
    const base = projectSavingsRoute(goal, snapshot, withIncome([]), today);
    const tips = projectSavingsRoute(
      goal,
      snapshot,
      withIncome([{ amount: 85, label: "Tips" }]),
      today,
    );
    const more = projectSavingsRoute(
      goal,
      snapshot,
      withIncome([
        { amount: 85, label: "Tips" },
        { amount: 50, label: "From Mom" },
      ]),
      today,
    );
    expect(base.eta).toBe("2027-01-06");
    expect(tips.eta).toBe("2026-12-28");
    expect(more.eta! < tips.eta!).toBe(true);
  });

  it("draws the new star right after You on the map, even if dated in UTC", () => {
    const after = projectSavingsRoute(
      goal,
      snapshot,
      // Reported at 9 PM Eastern = next day in UTC.
      withIncome([{ amount: 85, label: "Tips", date: "2026-10-04" }]),
      today,
    );
    const onMap = enrichWaypointsForMap(
      after.waypoints,
      goal,
      "2026-10-03",
      after.eta ?? goal.targetDate,
    );
    const youIndex = onMap.findIndex((w) => w.label === "You");
    const tipsIndex = onMap.findIndex((w) => w.label === "Tips");
    const firstUpcoming = onMap.findIndex(
      (w, i) => i > youIndex && w.status === "upcoming",
    );
    expect(tipsIndex).toBeGreaterThan(youIndex);
    expect(tipsIndex).toBeLessThan(firstUpcoming);
    expect(onMap[tipsIndex]).toMatchObject({ reported: true, status: "passed" });
  });
});

describe("receiving money adds a star to the route (demo mode)", () => {
  beforeEach(() => resetFixtureScenario());

  it("adds a star and an earlier ETA each time money comes in", () => {
    const first = addFixtureIncome({
      date: "2026-10-03",
      label: "Tips",
      amount: 85,
      description: "Extra shift",
    });
    expect(first.after.eta).toBe("2026-12-28");
    expect(first.event.type).toBe("income_reported");
    expect(first.event.description).toBe("Tips deposited to checking");

    const second = addFixtureIncome({
      date: "2026-10-03",
      label: "From Mom",
      amount: 50,
      description: "Money from someone",
    });
    const stars = second.after.waypoints.filter((w) => w.reported);
    expect(stars.map((w) => w.label)).toEqual(["Tips", "From Mom"]);
    expect(second.after.eta! < first.after.eta!).toBe(true);
    expect(second.after.saved).toBe(112 + 85 + 50);
    expect(second.event.previousWaypoints?.filter((w) => w.reported)).toHaveLength(1);
  });

  it("starts from the storyboard route after a reset", () => {
    addFixtureIncome({ date: "2026-10-03", label: "Tips", amount: 85, description: "x" });
    resetFixtureScenario();
    expect(fixtureProjectionForIncome().eta).toBe("2027-01-06");
  });
});

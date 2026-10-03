import type { Goal } from "@/lib/goals/types";
import type { FinancialSnapshot } from "@/lib/nessie/types";
import type { ProjectionResult } from "@/lib/projection/engine";
import { projectGoal } from "@/lib/projection/engine";
import { buildRouteWaypoints, formatWaypointLabel } from "@/lib/route-map/waypoints";
import { describe, expect, it } from "vitest";

const goal: Goal = {
  label: "Emergency fund",
  targetAmount: 800,
  targetDate: "2025-12-15",
  startDate: "2025-09-28",
  constellationId: "ursa-minor",
};

const snapshot: FinancialSnapshot = {
  fetchedAt: "2025-10-03T12:00:00.000Z",
  customerId: "demo",
  checkingBalance: 318,
  savingsBalance: 142.5,
  totalLiquid: 460,
  bills: [
    {
      id: "b-rent",
      payee: "Rent",
      amount: 650,
      dueDate: "2025-10-01",
      status: "paid",
    },
    {
      id: "b-phone",
      payee: "Phone bill",
      amount: 45,
      dueDate: "2025-10-12",
    },
  ],
  purchases: [],
  deposits: [],
  transfers: [],
  receivables: [],
  avgDailySpend: 11,
  avgDailyFoodSpend: 8,
  estimatedPaycheckAmount: 450,
  paycheckIntervalDays: 14,
};

describe("buildRouteWaypoints", () => {
  it("includes bills, paydays, and milestones on the route", () => {
    const ref = new Date("2025-10-03T12:00:00.000Z");
    const projection = projectGoal(goal, snapshot, ref);
    const waypoints = buildRouteWaypoints({
      goal,
      snapshot,
      projection,
      todayIso: "2025-10-03",
    });

    const rent = waypoints.find((w) => w.title === "Rent");
    expect(rent).toBeDefined();
    expect(rent!.passed).toBe(true);
    expect(formatWaypointLabel(rent!)).toBe("Rent · paid");

    const phone = waypoints.find((w) => w.title === "Phone bill");
    expect(phone).toBeDefined();
    expect(phone!.passed).toBe(false);
    expect(phone!.detail).toBe("Oct 12");

    const payday = waypoints.find(
      (w) => w.kind === "payday" && w.date === "2025-10-17",
    );
    expect(payday).toBeDefined();
    expect(payday!.passed).toBe(false);
    expect(formatWaypointLabel(payday!)).toBe("Payday · Oct 17");

    expect(waypoints.some((w) => w.kind === "milestone")).toBe(true);
  });

  it("drops events outside the journey window", () => {
    const projection: ProjectionResult = {
      currentSaved: 100,
      targetAmount: 800,
      targetDate: "2025-12-15",
      etaDate: null,
      daysEarlyOrLate: null,
      onTrack: false,
      progressPercent: 0.125,
      dailySeries: [{ date: "2025-10-03", balance: 100 }],
      avgDailySpendUsed: 11,
    };
    const farBill = {
      ...snapshot,
      bills: [
        {
          id: "x",
          payee: "Far",
          amount: 1,
          dueDate: "2026-06-01",
        },
      ],
    };
    const waypoints = buildRouteWaypoints({
      goal,
      snapshot: farBill,
      projection,
      todayIso: "2025-10-03",
    });
    expect(waypoints.some((w) => w.title === "Far")).toBe(false);
  });
});

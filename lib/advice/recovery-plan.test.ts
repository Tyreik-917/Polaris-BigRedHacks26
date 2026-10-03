import demoSnapshot from "@/fixtures/demo-snapshot.json";
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
  targetDate: "2025-12-15",
  constellationId: "ursa-minor",
};

const ref = new Date("2025-10-03T12:00:00.000Z");

/** Off-track finances (e.g. after a reroute from fresh Nessie spend). */
const lateSnapshot: FinancialSnapshot = {
  ...(demoSnapshot as FinancialSnapshot),
  savingsBalance: 100,
  avgDailySpend: 18,
};

describe("buildRecoveryPlan", () => {
  it("only runs when the route is late", () => {
    expect(projectGoal(goal, lateSnapshot, ref).onTrack).toBe(false);
  });

  it("matches hackathon recovery example copy", () => {
    const plan = buildRecoveryPlan(goal, lateSnapshot, ref);
    expect(plan).not.toBeNull();
    expect(plan!.moves).toHaveLength(3);
    expect(plan!.headline).toBe(
      "Three moves get you back to Dec 15: collect the $25 Sam owes you, cook 3 dinners this week, skip one coffee run a week.",
    );
    expect(recoveryPlanDetail(plan!)).toContain("on time");
    expect(plan!.onTrackIfFollowed).toBe(true);
  });

  it("returns null when already on track", () => {
    const rich: FinancialSnapshot = {
      ...(demoSnapshot as FinancialSnapshot),
      savingsBalance: 380,
      avgDailySpend: 2,
    };
    const plan = buildRecoveryPlan(goal, rich, ref);
    expect(plan).toBeNull();
  });
});

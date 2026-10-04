import { beforeEach, describe, expect, it } from "vitest";
import {
  addFixtureExpectedIncome,
  addFixtureIncome,
  fixtureGoal,
  resetFixtureScenario,
} from "@/lib/fixtures";
import type { GoalAdjustments } from "@/lib/goals/store";
import { enrichWaypointsForMap } from "@/lib/map-coords";
import type { FinancialSnapshot } from "@/lib/nessie/types";
import {
  parseExpectedMoney,
  parseMentionedDate,
  parseReceivedMoney,
} from "@/lib/polaris/received-money";
import { projectSavingsRoute } from "@/lib/polaris/savings-route-projection";
import type { Waypoint } from "@/lib/types";

const TODAY = "2026-10-04";

/** True when dates run in year → month → day order. */
function inDateOrder(stars: Waypoint[]): boolean {
  return stars.every((w, i) => i === 0 || stars[i - 1].date <= w.date);
}

describe("parseExpectedMoney: a friend will send money on a date", () => {
  it.each([
    ["My friend Sam is sending me $20 on October 15", "From Sam", "2026-10-15"],
    ["Sam will send me $20 on 10/15", "From Sam", "2026-10-15"],
    ["My friend Sam is sending me $20 on Oct 20, 2026", "From Sam", "2026-10-20"],
    ["Jake is paying me back $20 on 2026-11-02", "From Jake", "2026-11-02"],
    ["I'm getting $20 from Priya on the 12th", "From Priya", "2026-10-12"],
    ["my friend is sending me $20 on the 15th of November", "From friend", "2026-11-15"],
    // No year and the date has passed this year → next year.
    ["Sam is sending me $20 on Jan 3", "From Sam", "2027-01-03"],
  ])("parses message %#", (text, label, date) => {
    expect(parseExpectedMoney(text, TODAY)).toEqual(
      expect.objectContaining({ amount: 20, label, date }),
    );
  });

  it("asks for a date when none is given", () => {
    expect(parseExpectedMoney("Sam is sending me $20", TODAY)).toMatchObject({
      amount: 20,
      date: null,
    });
  });

  it.each(["Sam sent me $20", "Is Sam sending me $20 on Friday?", "Sam is sending me a gift"])(
    "is not promised money (%#)",
    (text) => {
      expect(parseExpectedMoney(text, TODAY)).toBeNull();
    },
  );

  it("is not mistaken for money already received", () => {
    expect(parseReceivedMoney("My friend Sam is sending me $20 on October 15")).toBeNull();
  });

  it("rejects impossible dates", () => {
    expect(parseMentionedDate("on Feb 30", TODAY)).toBeNull();
  });
});

const snapshot: FinancialSnapshot = {
  fetchedAt: "2026-10-04T12:00:00Z",
  customerId: "maya",
  checkingBalance: 612.4,
  savingsBalance: 112,
  totalLiquid: 724.4,
  bills: [
    { id: "phone", payee: "Phone bill", amount: 45, dueDate: "2026-10-12", recurring: true },
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
const goal = { ...fixtureGoal, createdAt: "2026-10-04T12:00:00.000Z" };
const today = new Date("2026-10-04T16:00:00Z");

function withExpected(events: { date: string; amount: number; label: string }[]): GoalAdjustments {
  return {
    reportedSpendTotal: 0,
    reportedIncomeTotal: 0,
    incomeEvents: [],
    extraBills: [],
    expectedIncome: events.map((e) => ({ ...e, description: e.label })),
  };
}

describe("a friend sending $20 on a date adds a star in date order (live projection)", () => {
  it("adds an upcoming star on that date, between the stars around it", () => {
    const p = projectSavingsRoute(
      goal,
      snapshot,
      withExpected([{ date: "2026-10-15", amount: 20, label: "From Sam" }]),
      today,
    );
    const star = p.waypoints.find((w) => w.expected);
    expect(star).toMatchObject({
      date: "2026-10-15",
      label: "From Sam",
      amount: 20,
      status: "upcoming",
    });
    expect(inDateOrder(p.waypoints)).toBe(true);
    const i = p.waypoints.indexOf(star!);
    expect(p.waypoints.slice(0, i).every((w) => w.date <= "2026-10-15")).toBe(true);
    expect(p.waypoints.slice(i + 1).every((w) => w.date >= "2026-10-15")).toBe(true);
  });

  it("keeps the star even when it is later than the usual checkpoints", () => {
    const p = projectSavingsRoute(
      goal,
      snapshot,
      withExpected([{ date: "2026-12-01", amount: 20, label: "From Sam" }]),
      today,
    );
    expect(p.waypoints.some((w) => w.expected && w.date === "2026-12-01")).toBe(true);
    expect(inDateOrder(p.waypoints)).toBe(true);
  });

  it("orders stars across years: Dec 2026 before Jan 2027", () => {
    const p = projectSavingsRoute(
      { ...goal, targetDate: "2027-02-01" },
      snapshot,
      withExpected([
        { date: "2027-01-03", amount: 20, label: "From Sam" },
        { date: "2026-12-20", amount: 20, label: "From Jo" },
      ]),
      today,
    );
    const promised = p.waypoints.filter((w) => w.expected).map((w) => w.date);
    expect(promised).toEqual(["2026-12-20", "2027-01-03"]);
    expect(inDateOrder(p.waypoints)).toBe(true);
  });

  it("moves the demo ETA sooner but doesn't count the money as saved yet", () => {
    const base = projectSavingsRoute(goal, snapshot, withExpected([]), today);
    const p = projectSavingsRoute(
      goal,
      snapshot,
      withExpected([{ date: "2026-10-15", amount: 20, label: "From Sam" }]),
      today,
    );
    expect(p.eta! < base.eta!).toBe(true);
    expect(p.saved).toBe(base.saved);
  });

  it("is drawn on the map in date order, not next to You", () => {
    const p = projectSavingsRoute(
      goal,
      snapshot,
      withExpected([{ date: "2026-11-01", amount: 20, label: "From Sam" }]),
      today,
    );
    const onMap = enrichWaypointsForMap(p.waypoints, goal, TODAY, p.eta ?? goal.targetDate);
    expect(onMap.some((w) => w.expected)).toBe(true);
    // Everything after "You" runs in date order up to the goal.
    const after = onMap.slice(onMap.findIndex((w) => w.label === "You"));
    expect(inDateOrder(after)).toBe(true);
  });
});

describe("money can't arrive after you do", () => {
  it("never puts the ETA before a promised payment it depends on", () => {
    const p = projectSavingsRoute(
      goal,
      snapshot,
      withExpected([{ date: "2027-01-03", amount: 20, label: "From Jo" }]),
      today,
    );
    expect(p.eta! >= "2027-01-03").toBe(true);
    const onMap = enrichWaypointsForMap(p.waypoints, goal, TODAY, p.eta!);
    expect(onMap.some((w) => w.expected && w.date === "2027-01-03")).toBe(true);
  });
});

describe("a friend sending $20 on a date (demo mode)", () => {
  beforeEach(() => resetFixtureScenario());

  it("adds the star between the storyboard checkpoints by date", () => {
    const { after, event } = addFixtureExpectedIncome({
      date: "2026-10-15",
      label: "From Sam",
      amount: 20,
      description: "Money from someone",
    });
    expect(event.type).toBe("income_expected");
    const labels = after.waypoints.map((w) => `${w.label} ${w.date}`);
    expect(labels).toEqual([
      "Payday 2026-10-10",
      "Phone bill 2026-10-12",
      "From Sam 2026-10-15",
      "Rent 2026-11-05",
      "Payday 2026-11-21",
    ]);
    expect(after.saved).toBe(112);
    expect(after.eta! < "2027-01-06").toBe(true);
  });

  it("keeps money already received next to You and promised money in date order", () => {
    addFixtureIncome({ date: TODAY, label: "Tips", amount: 85, description: "Extra shift" });
    addFixtureExpectedIncome({ date: "2026-11-20", label: "From Jo", amount: 20, description: "x" });
    const { after } = addFixtureExpectedIncome({
      date: "2026-10-20",
      label: "From Sam",
      amount: 20,
      description: "x",
    });
    expect(after.waypoints[0]).toMatchObject({ label: "Tips", reported: true });
    const rest = after.waypoints.slice(1);
    expect(inDateOrder(rest)).toBe(true);
    expect(rest.filter((w) => w.expected).map((w) => w.label)).toEqual(["From Sam", "From Jo"]);
  });
});

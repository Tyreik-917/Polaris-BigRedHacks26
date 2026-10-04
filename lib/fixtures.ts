import { showcaseImages } from "@/lib/demo/showcase-images";
import type {
  Goal,
  Overview,
  PostcardResponse,
  Projection,
  RouteEventRecord,
  RouteEventsResponse,
  Waypoint,
  WaypointCheckpoint,
} from "@/lib/types";

/** Demo scenario: save $1,000 by December 10 (storyboard). */
export const FIXTURE_GOAL_ID = "save-1000-dec10";

export const DEMO_TARGET_DATE = "2026-12-10";

export const fixtureGoal: Goal = {
  id: FIXTURE_GOAL_ID,
  customerId: "maya-demo",
  name: "Save $1,000",
  targetAmount: 1000,
  targetDate: DEMO_TARGET_DATE,
  savingsAccountId: "sav-maya",
  createdAt: "2026-09-15T12:00:00.000Z",
};

export const fixtureOverview: Overview = {
  checking: 612.4,
  savings: 112,
  billsBeforeTarget: 1035,
  foodSpending: 45,
  paycheckIntervalLabel: "Every other Fri",
  paycheckAmount: 380,
};

const GOAL_IMAGINE_URL = showcaseImages.goalDestination;

const demoCheckpoints: Waypoint[] = [
  {
    date: "2026-10-10",
    label: "Payday",
    kind: "income",
    amount: 380,
    status: "upcoming",
  },
  {
    date: "2026-10-12",
    label: "Phone bill",
    kind: "bill",
    amount: 45,
    status: "upcoming",
  },
  {
    date: "2026-11-05",
    label: "Rent",
    kind: "bill",
    amount: 820,
    status: "upcoming",
  },
  {
    date: "2026-11-21",
    label: "Payday",
    kind: "income",
    amount: 380,
    status: "upcoming",
  },
];

export const fixtureProjectionBefore: Projection = {
  goalId: FIXTURE_GOAL_ID,
  saved: 112,
  eta: "2027-01-06",
  daysLate: 27,
  onTrack: false,
  waypoints: demoCheckpoints,
  nextMove: {
    id: "move-tips",
    label: "Pick up an extra shift this week",
    savings: 85,
    daysGained: 9,
  },
  recoveryMoves: [],
  etaWithMoves: "2026-12-10",
  computedAt: "2026-10-03T16:00:00.000Z",
};

export const fixtureProjectionAfterTips: Projection = {
  goalId: FIXTURE_GOAL_ID,
  saved: 197,
  eta: "2026-12-28",
  daysLate: 18,
  onTrack: false,
  waypoints: [
    {
      date: "2026-10-03",
      label: "Tips",
      kind: "income",
      amount: 85,
      status: "passed",
    },
    ...demoCheckpoints,
  ],
  nextMove: {
    id: "move-tips-2",
    label: "Two more nights like this and you'll make Dec 10",
    savings: 85,
    daysGained: 9,
  },
  recoveryMoves: [],
  etaWithMoves: "2026-12-10",
  computedAt: "2026-10-03T20:00:00.000Z",
};

export const fixturePostcardPending: PostcardResponse = {
  status: "pending",
};

export const fixturePostcardReady: PostcardResponse = {
  status: "ready",
  url: GOAL_IMAGINE_URL,
};

const CHECKPOINT_DETAILS: Record<string, WaypointCheckpoint> = {
  "2026-10-10|Payday": {
    checkpointIndex: 1,
    checkpointTotal: 4,
    imagineUrl: showcaseImages.paycheck,
    inspireLine: "Every paycheck is a step toward $1,000.",
    comingIn: [{ label: "Paycheck · campus job", amount: 380 }],
    dueBeforeNext: [{ label: "Phone bill · Oct 12", amount: 45 }],
    savedTowardGoal: 180,
  },
  "2026-10-12|Phone bill": {
    checkpointIndex: 2,
    checkpointTotal: 4,
    imagineUrl: showcaseImages.phoneBill,
    inspireLine: "Small bills, steady progress.",
    comingIn: [],
    dueBeforeNext: [{ label: "Phone bill", amount: 45 }],
    savedTowardGoal: 220,
  },
  "2026-11-05|Rent": {
    checkpointIndex: 3,
    checkpointTotal: 4,
    imagineUrl: showcaseImages.rent,
    inspireLine: "Rent clears and you keep moving.",
    comingIn: [{ label: "Paycheck · Oct 24", amount: 380 }],
    dueBeforeNext: [{ label: "Rent", amount: 820 }],
    savedTowardGoal: 380,
  },
  "2026-11-21|Payday": {
    checkpointIndex: 4,
    checkpointTotal: 4,
    imagineUrl: showcaseImages.latePaycheck,
    inspireLine: "Over halfway to $1,000. Keep going.",
    comingIn: [{ label: "Paycheck · campus job", amount: 380 }],
    dueBeforeNext: [
      { label: "Spotify · Nov 20", amount: 11 },
      { label: "Groceries (estimated)", amount: 45 },
    ],
    savedTowardGoal: 540,
  },
  "2026-10-03|Tips": {
    checkpointIndex: 1,
    checkpointTotal: 4,
    imagineUrl: showcaseImages.tipsShift,
    inspireLine: "Tonight's tips moved your arrival 9 days sooner.",
    comingIn: [{ label: "Tips · campus job", amount: 85 }],
    dueBeforeNext: [],
    savedTowardGoal: 197,
  },
};

export function fixtureCheckpointDetail(
  waypoint: Waypoint,
  goal: Goal,
): WaypointCheckpoint {
  const key = `${waypoint.date}|${waypoint.label}`;
  const fixed = CHECKPOINT_DETAILS[key];
  if (fixed) return fixed;

  const isIncome = waypoint.kind === "income";
  return {
    checkpointIndex: 1,
    checkpointTotal: 4,
    imagineUrl: goal.postcardUrl ?? GOAL_IMAGINE_URL,
    inspireLine: isIncome
      ? "Income ahead keeps your route on track."
      : "Stay ahead of this due date.",
    comingIn: isIncome
      ? [{ label: waypoint.label, amount: Math.abs(waypoint.amount) }]
      : [],
    dueBeforeNext: !isIncome
      ? [{ label: waypoint.label, amount: Math.abs(waypoint.amount) }]
      : [],
    savedTowardGoal: undefined,
  };
}

let fixtureEventCursor = 0;
let fixtureTipsApplied = false;
let fixturePurchaseApplied = false;
let fixtureSamPaid = false;

let postcardPolls = 0;

export function resetFixtureScenario() {
  fixtureEventCursor = 0;
  fixtureTipsApplied = false;
  fixturePurchaseApplied = false;
  fixtureSamPaid = false;
  postcardPolls = 0;
}

export function getFixturePostcard(): PostcardResponse {
  postcardPolls += 1;
  if (postcardPolls >= 2) return fixturePostcardReady;
  return fixturePostcardPending;
}

export function fixtureRouteEvents(since: string): RouteEventsResponse {
  void since;
  const events: RouteEventRecord[] = [];

  if (fixtureTipsApplied && fixtureEventCursor < 1) {
    fixtureEventCursor = 1;
    events.push({
      id: "evt-tips-85",
      type: "income_reported",
      description: "Tips deposited to checking",
      amount: 85,
      previousEta: fixtureProjectionBefore.eta,
      newEta: fixtureProjectionAfterTips.eta,
      account: "Capital One checking",
      previousWaypoints: fixtureProjectionBefore.waypoints,
      projection: fixtureProjectionAfterTips,
    });
  }

  if (fixturePurchaseApplied && fixtureEventCursor < 2) {
    fixtureEventCursor = 2;
    events.push({
      id: "evt-chipotle",
      type: "purchase_detected",
      description: "Chipotle purchase",
      amount: 32.4,
      previousEta: fixtureProjectionAfterTips.eta,
      newEta: "2027-01-02",
      merchant: "Chipotle",
      account: "Capital One checking",
      previousWaypoints: fixtureProjectionAfterTips.waypoints,
      projection: {
        ...fixtureProjectionAfterTips,
        eta: "2027-01-02",
        daysLate: 23,
      },
    });
  }

  if (fixtureSamPaid && fixtureEventCursor < 3) {
    fixtureEventCursor = 3;
    events.push({
      id: "evt-sam-paid",
      type: "transfer_received",
      description: "Sam paid you $25",
      amount: 25,
      previousEta: fixtureProjectionAfterTips.eta,
      newEta: "2026-12-26",
      projection: {
        ...fixtureProjectionAfterTips,
        saved: 222,
        eta: "2026-12-26",
        daysLate: 16,
        onTrack: false,
      },
    });
  }

  return { events };
}

export function triggerFixtureTips() {
  fixtureTipsApplied = true;
}

export function triggerFixturePurchase() {
  fixturePurchaseApplied = true;
}

export function triggerFixtureSamPayment() {
  fixtureSamPaid = true;
}

export const fixturePolarisRouteMessage =
  "I mapped every bill and payday between now and Dec 10. Each one is a star on your route. Tap any star to see what's due and what's coming in.";

export const fixtureGoalSetUserLine =
  "I want to save $1,000 by December 10th.";

export const fixtureTipsUserLine = "I made $85 in tips at work tonight!";

export const fixtureTipsPolarisReply =
  "Nice work! I added the $85 and found a faster route. You now arrive Dec 28, 9 days sooner. Two more nights like this and you'll make Dec 10.";

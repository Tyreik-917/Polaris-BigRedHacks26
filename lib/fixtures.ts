import type {
  Goal,
  Overview,
  PostcardResponse,
  Projection,
  RouteEventRecord,
  RouteEventsResponse,
} from "@/lib/types";

export const FIXTURE_GOAL_ID = "flight-home";

export const fixtureGoal: Goal = {
  id: FIXTURE_GOAL_ID,
  customerId: "maya-demo",
  name: "Flight home",
  targetAmount: 400,
  targetDate: "2026-12-15",
  savingsAccountId: "sav-maya",
  createdAt: "2026-10-01T12:00:00.000Z",
};

export const fixtureOverview: Overview = {
  checking: 842.5,
  savings: 112,
  billsBeforeTarget: 245,
  foodSpending: 68,
};

const baseWaypoints: Projection["waypoints"] = [
  {
    date: "2026-10-05",
    label: "Start",
    kind: "milestone",
    amount: 0,
    status: "passed",
  },
  {
    date: "2026-10-12",
    label: "Phone bill",
    kind: "bill",
    amount: 45,
    status: "passed",
  },
  {
    date: "2026-10-18",
    label: "Rent",
    kind: "bill",
    amount: 820,
    status: "passed",
  },
  {
    date: "2026-10-25",
    label: "Payday",
    kind: "income",
    amount: 640,
    status: "passed",
  },
  {
    date: "2026-11-01",
    label: "You",
    kind: "milestone",
    amount: 0,
    status: "upcoming",
  },
  {
    date: "2026-11-15",
    label: "Utilities",
    kind: "bill",
    amount: 62,
    status: "upcoming",
  },
  {
    date: "2026-12-01",
    label: "Payday",
    kind: "income",
    amount: 640,
    status: "upcoming",
  },
  {
    date: "2026-12-15",
    label: "Flight home",
    kind: "milestone",
    amount: 400,
    status: "upcoming",
  },
];

export const fixtureProjectionBefore: Projection = {
  goalId: FIXTURE_GOAL_ID,
  saved: 112,
  eta: "2027-01-03",
  daysLate: 19,
  onTrack: false,
  waypoints: baseWaypoints,
  nextMove: {
    id: "move-cook",
    label: "Cook twice this week",
    savings: 34,
    daysGained: 6,
  },
  recoveryMoves: [],
  etaWithMoves: "2026-12-15",
  computedAt: "2026-10-03T16:00:00.000Z",
};

export const fixtureProjectionAfter: Projection = {
  goalId: FIXTURE_GOAL_ID,
  saved: 112,
  eta: "2027-01-14",
  daysLate: 30,
  onTrack: false,
  waypoints: [
    ...baseWaypoints.slice(0, 5),
    {
      date: "2026-11-08",
      label: "Chipotle",
      kind: "bill",
      amount: 32.4,
      status: "passed",
    },
    ...baseWaypoints.slice(5),
  ],
  nextMove: {
    id: "move-cook",
    label: "Cook twice this week",
    savings: 34,
    daysGained: 6,
  },
  recoveryMoves: [
    {
      id: "move-cook-2",
      label: "Cook twice this week instead of takeout",
      savings: 34,
      daysGained: 6,
    },
    {
      id: "move-skip-coffee",
      label: "Skip coffee runs this week",
      savings: 18,
      daysGained: 3,
    },
    {
      id: "move-sam",
      label: "Request $25 from Sam",
      savings: 25,
      daysGained: 4,
      action: { type: "p2p_request", payerId: "sam", amount: 25 },
    },
  ],
  etaWithMoves: "2026-12-15",
  computedAt: "2026-10-03T16:05:00.000Z",
};

export const fixturePostcardPending: PostcardResponse = {
  status: "pending",
};

export const fixturePostcardReady: PostcardResponse = {
  status: "ready",
  url: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=200&h=140&fit=crop",
};

let fixtureEventCursor = 0;
let fixturePurchaseApplied = false;
let fixtureSamPaid = false;

let postcardPolls = 0;

export function resetFixtureScenario() {
  fixtureEventCursor = 0;
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

  if (fixturePurchaseApplied && fixtureEventCursor < 1) {
    fixtureEventCursor = 1;
    events.push({
      id: "evt-chipotle",
      type: "purchase_detected",
      description: "Chipotle purchase",
      amount: 32.4,
      previousEta: fixtureProjectionBefore.eta,
      newEta: fixtureProjectionAfter.eta,
      merchant: "Chipotle",
      account: "Capital One checking",
      previousWaypoints: fixtureProjectionBefore.waypoints,
      projection: fixtureProjectionAfter,
    });
  }

  if (fixtureSamPaid && fixtureEventCursor < 2) {
    fixtureEventCursor = 2;
    events.push({
      id: "evt-sam-paid",
      type: "transfer_received",
      description: "Sam paid you $25",
      amount: 25,
      previousEta: fixtureProjectionAfter.eta,
      newEta: "2027-01-10",
      projection: {
        ...fixtureProjectionAfter,
        daysLate: 26,
        eta: "2027-01-10",
        onTrack: false,
      },
    });
  }

  return { events };
}

export function triggerFixturePurchase() {
  fixturePurchaseApplied = true;
}

export function triggerFixtureSamPayment() {
  fixtureSamPaid = true;
}

export const fixturePolarisRouteMessage =
  "Rent cleared with $82 to spare. Next turn: cook twice this week — that moves your arrival up 6 days.";

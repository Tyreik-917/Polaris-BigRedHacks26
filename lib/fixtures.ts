import { showcaseImages } from "@/lib/demo/showcase-images";
import {
  demoDaysSoonerForIncome,
  localIsoDate,
} from "@/lib/polaris/received-money";
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
  if (waypoint.expected) {
    const days = demoDaysSoonerForIncome(waypoint.amount);
    return {
      checkpointIndex: 1,
      checkpointTotal: 4,
      imagineUrl: GOAL_IMAGINE_URL,
      inspireLine:
        days > 0
          ? `When this lands, you arrive ${days} day${days === 1 ? "" : "s"} sooner.`
          : `+${usd(waypoint.amount)} on the way toward ${goal.name}.`,
      comingIn: [{ label: waypoint.label, amount: waypoint.amount }],
      dueBeforeNext: [],
      savedTowardGoal: undefined,
    };
  }

  if (waypoint.reported) {
    const days = demoDaysSoonerForIncome(waypoint.amount);
    return {
      checkpointIndex: 1,
      checkpointTotal: 4,
      imagineUrl:
        waypoint.label === "Tips" ? showcaseImages.tipsShift : GOAL_IMAGINE_URL,
      inspireLine:
        days > 0
          ? `This +${usd(waypoint.amount)} moved your arrival ${days} day${days === 1 ? "" : "s"} sooner.`
          : `Every bit counts: +${usd(waypoint.amount)} toward ${goal.name}.`,
      comingIn: [{ label: waypoint.label, amount: waypoint.amount }],
      dueBeforeNext: [],
      savedTowardGoal: fixtureProjectionForIncome().saved,
    };
  }

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
let fixturePurchaseApplied = false;
let fixtureSamPaid = false;

let postcardPolls = 0;

export function resetFixtureScenario() {
  fixtureEventCursor = 0;
  fixtureIncome = [];
  fixtureExpected = [];
  pendingIncomeEvents = [];
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

  // Money added from the demo panel shows up on the next poll.
  events.push(...pendingIncomeEvents);
  pendingIncomeEvents = [];

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

/* ---------- "I received money" in demo mode ---------- */

type FixtureIncome = {
  date: string;
  label: string;
  amount: number;
  description: string;
};

let fixtureIncome: FixtureIncome[] = [];
/** Money someone said they will send on a future date. */
let fixtureExpected: FixtureIncome[] = [];
let pendingIncomeEvents: RouteEventRecord[] = [];

function usd(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function shiftIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysFrom(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) /
      86400000,
  );
}

/** The demo route after every amount the user said they received. */
export function fixtureProjectionForIncome(
  list: FixtureIncome[] = fixtureIncome,
  expected: FixtureIncome[] = fixtureExpected,
): Projection {
  if (list.length === 0 && expected.length === 0) return fixtureProjectionBefore;
  const received = list.reduce((sum, i) => sum + i.amount, 0);
  // Promised money counts toward the ETA once it lands (if before the baseline arrival).
  const counted = expected.filter(
    (i) => i.date <= (fixtureProjectionBefore.eta ?? "2027-01-06"),
  );
  const promised = counted.reduce((sum, i) => sum + i.amount, 0);
  const total = received + promised;
  const shifted = shiftIso(
    fixtureProjectionBefore.eta ?? "2027-01-06",
    -demoDaysSoonerForIncome(total),
  );
  // Money can't get you there before it arrives.
  const lastArrival = counted.reduce(
    (latest, i) => (i.date > latest ? i.date : latest),
    "",
  );
  const eta = lastArrival > shifted ? lastArrival : shifted;
  const daysLate = daysFrom(DEMO_TARGET_DATE, eta);
  const stillNeeded = Math.ceil((Math.max(0, daysLate) * 85) / 9);
  return {
    ...fixtureProjectionBefore,
    saved: Math.round((112 + received) * 100) / 100,
    eta,
    daysLate,
    onTrack: daysLate <= 0,
    waypoints: [
      ...list.map(
        (i): Waypoint => ({
          date: i.date,
          label: i.label,
          kind: "income",
          amount: i.amount,
          status: "passed",
          reported: true,
        }),
      ),
      // Promised money joins the bills and paydays in date order (year, month, day).
      ...[
        ...demoCheckpoints,
        ...expected.map(
          (i): Waypoint => ({
            date: i.date,
            label: i.label,
            kind: "income",
            amount: i.amount,
            status: "upcoming",
            expected: true,
          }),
        ),
      ].sort((a, b) => a.date.localeCompare(b.date)),
    ],
    nextMove:
      daysLate > 0
        ? {
            id: "move-more-income",
            label:
              total === 85 && received === 85
                ? "Two more nights like this and you'll make Dec 10"
                : `About ${usd(stillNeeded)} more gets you there by Dec 10`,
            savings: stillNeeded,
            daysGained: daysLate,
          }
        : null,
    computedAt: new Date().toISOString(),
  };
}

/** Records received money; returns the route before/after and the reroute event. */
export function addFixtureIncome(income: FixtureIncome): {
  before: Projection;
  after: Projection;
  event: RouteEventRecord;
} {
  const before = fixtureProjectionForIncome();
  fixtureIncome = [...fixtureIncome, income];
  const after = fixtureProjectionForIncome();
  return {
    before,
    after,
    event: {
      id: `income-${fixtureIncome.length}-${income.label}-${income.amount}`,
      type: "income_reported",
      description: `${income.label} deposited to checking`,
      amount: income.amount,
      previousEta: before.eta,
      newEta: after.eta,
      account: "Capital One checking",
      previousWaypoints: before.waypoints,
      projection: after,
    },
  };
}

/** Records money someone will send on `income.date`; returns the route before/after. */
export function addFixtureExpectedIncome(income: FixtureIncome): {
  before: Projection;
  after: Projection;
  event: RouteEventRecord;
} {
  const before = fixtureProjectionForIncome();
  fixtureExpected = [...fixtureExpected, income];
  const after = fixtureProjectionForIncome();
  const when = new Date(`${income.date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(income.date.slice(0, 4) !== localIsoDate().slice(0, 4)
      ? { year: "numeric" as const }
      : {}),
  });
  return {
    before,
    after,
    event: {
      id: `expected-${fixtureExpected.length}-${income.label}-${income.date}`,
      type: "income_expected",
      description: `${income.label} · arriving ${when}`,
      amount: income.amount,
      previousEta: before.eta,
      newEta: after.eta,
      previousWaypoints: before.waypoints,
      projection: after,
    },
  };
}

/** What Polaris says after money comes in (numbers from the projection, not a model). */
export function fixtureIncomeReply(
  income: { label: string; amount: number },
  before: Projection,
  after: Projection,
): string {
  if (fixtureIncome.length === 1 && income.label === "Tips" && income.amount === 85) {
    return fixtureTipsPolarisReply;
  }
  const added = `Nice! I added ${usd(income.amount)} to your Capital One checking and put a new star on your route.`;
  if (!after.eta) return added;
  const gained = before.eta ? daysFrom(after.eta, before.eta) : 0;
  const when = new Date(`${after.eta}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  if (after.onTrack) {
    return `${added} You're back on course: arriving ${when}, in time for Dec 10.`;
  }
  if (gained > 0) {
    return `${added} You now arrive ${when}, ${gained} day${gained === 1 ? "" : "s"} sooner.`;
  }
  return `${added} Your arrival holds at ${when}, but every bit counts.`;
}

export function triggerFixtureTips() {
  const { event } = addFixtureIncome({
    date: localIsoDate(),
    label: "Tips",
    amount: 85,
    description: "Extra shift",
  });
  pendingIncomeEvents.push(event);
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

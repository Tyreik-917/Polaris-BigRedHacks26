/** Shared Polaris types (frontend + backend). */

export type Goal = {
  id: string;
  customerId: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  savingsAccountId: string;
  postcardUrl?: string;
  createdAt: string;
};

export type Waypoint = {
  date: string;
  label: string;
  kind: "bill" | "income" | "milestone" | "move";
  amount: number;
  status: "passed" | "upcoming";
};

export type Move = {
  id: string;
  label: string;
  savings: number;
  daysGained: number;
  action?: { type: "p2p_request"; payerId: string; amount: number };
};

export type Projection = {
  goalId: string;
  saved: number;
  eta: string | null;
  daysLate: number;
  onTrack: boolean;
  waypoints: Waypoint[];
  nextMove: Move | null;
  recoveryMoves: Move[];
  etaWithMoves: string | null;
  computedAt: string;
};

export type RouteEvent = {
  type: "purchase_detected" | "user_reported" | "transfer_received";
  description: string;
  amount: number;
  previousEta: string | null;
  newEta: string | null;
};

export type RouteEventRecord = RouteEvent & {
  id: string;
  merchant?: string;
  account?: string;
  previousWaypoints?: Waypoint[];
  projection?: Projection;
};

export type RouteEventsResponse = {
  events: RouteEventRecord[];
};

export type Overview = {
  checking: number;
  savings: number;
  billsBeforeTarget: number;
  foodSpending: number;
};

export type PostcardResponse = {
  status: "pending" | "ready";
  url?: string;
};

export type ParsedGoalDraft = {
  name: string;
  targetAmount: number;
  targetDate: string;
};

export type ChatMessage = {
  id: string;
  from: "polaris" | "user";
  text: string;
  spokenDurationSec?: number;
};

export type SeedIds = {
  maya: {
    customerId: string;
    checkingAccountId: string;
    savingsAccountId: string;
    name: string;
  };
  sam: {
    customerId: string;
    checkingAccountId: string;
    name: string;
  };
  merchants: Record<string, string>;
};

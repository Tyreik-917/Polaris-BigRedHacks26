"use client";

import {
  FIXTURE_GOAL_ID,
  fixtureGoal,
  fixtureOverview,
  getFixturePostcard,
  fixtureRouteEvents,
  resetFixtureScenario,
  fixtureIncomeReply,
  fixtureProjectionForIncome,
  addFixtureIncome,
  addFixtureExpectedIncome,
  triggerFixturePurchase,
  triggerFixtureSamPayment,
  triggerFixtureTips,
} from "@/lib/fixtures";
import {
  formatMonDayYear,
  localIsoDate,
  parseExpectedMoney,
  parseReceivedMoney,
} from "@/lib/polaris/received-money";
import { loadGoal, saveGoal } from "@/lib/goal-storage";
import { polarisFetch } from "@/lib/api/client-fetch";
import { readApiError } from "@/lib/api/read-error";
import { DEMO_PERSONA } from "@/lib/demo/persona";
import type {
  Goal,
  Overview,
  ParsedGoalDraft,
  PostcardResponse,
  Projection,
  RouteEventRecord,
  RouteEventsResponse,
  Waypoint,
} from "@/lib/types";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useUIStore } from "@/lib/store";
import { toast } from "sonner";

export const useFixtures =
  process.env.NEXT_PUBLIC_USE_FIXTURES === "true" ||
  process.env.NEXT_PUBLIC_USE_FIXTURES === "1";

const FIXTURE_DELAY_MS = 300;

function delay<T>(value: T, ms = FIXTURE_DELAY_MS): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

/**
 * Retries once on a network error or 5xx, but only for GETs: replaying a POST
 * could create a second Nessie purchase or transfer.
 */
async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const attempts = method === "GET" ? 2 : 1;
  let last: Response | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const willRetry = attempt < attempts - 1;
    try {
      const res = await polarisFetch(input, init);
      if (res.ok || res.status < 500 || !willRetry) return res;
      last = res;
    } catch {
      if (!willRetry) throw new Error("Network error");
    }
    toast.message("Polaris lost signal, retrying…");
  }
  return last!;
}

export async function demoLogin(credentials: {
  email: string;
  password: string;
}): Promise<{ customerId: string | null }> {
  // Credentials are always checked server-side, even in fixture mode.
  const res = await fetchWithRetry("/api/session/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (useFixtures && (res.ok || res.status === 503)) {
    // 503 = credentials accepted but no Nessie customer; fixtures don't need one.
    resetFixtureScenario();
    return delay({ customerId: "maya-demo" });
  }
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as { customerId: string | null };
  return { customerId: data.customerId };
}

export async function fetchOverview(goalId: string): Promise<Overview> {
  if (useFixtures) return delay(fixtureOverview);
  const goal = loadGoal(goalId);
  const headers: HeadersInit = {};
  if (goal?.targetDate) {
    headers["x-polaris-target-date"] = goal.targetDate;
  }
  const res = await fetchWithRetry("/api/overview", { headers });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as {
    checking: number;
    savings: number;
    billsBeforeTarget: number;
    weeklyFoodSpend: number;
  };
  return {
    checking: data.checking,
    savings: data.savings,
    billsBeforeTarget: data.billsBeforeTarget,
    foodSpending: data.weeklyFoodSpend,
  };
}

export async function parseGoalText(text: string): Promise<ParsedGoalDraft> {
  if (useFixtures) {
    return delay({
      name: "Save $1,000",
      targetAmount: 1000,
      targetDate: "2026-12-10",
    });
  }
  const res = await fetchWithRetry("/api/goals/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as ParsedGoalDraft;
  return data;
}

export type DestinationChatTurn = { role: "user" | "assistant"; content: string };

export async function chatDestination(
  messages: DestinationChatTurn[],
): Promise<{ reply: string; goal: ParsedGoalDraft | null }> {
  if (useFixtures) {
    const last = messages[messages.length - 1]?.content ?? "";
    if (/1,?000/.test(last) && /dec(ember)?\s*10/i.test(last)) {
      return delay({
        reply:
          "Destination set. I checked your Capital One accounts, your bills and your paydays.",
        goal: {
          name: "Save $1,000",
          targetAmount: 1000,
          targetDate: "2026-12-10",
        },
      });
    }
    return delay({
      reply:
        'Tell me something like "Save $1,000 by December 10th" or tap "$1,000 by Dec 10" below.',
      goal: null,
    });
  }
  // Not retried: it's a POST, and a slow Grok reply shouldn't be sent twice.
  const res = await polarisFetch("/api/goals/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return (await res.json()) as { reply: string; goal: ParsedGoalDraft | null };
}

export async function createGoal(draft: ParsedGoalDraft): Promise<Goal> {
  const id =
    draft.name.toLowerCase().replace(/\s+/g, "-").slice(0, 32) ||
    FIXTURE_GOAL_ID;
  const goal: Goal = {
    id,
    customerId: "demo",
    name: draft.name,
    targetAmount: draft.targetAmount,
    targetDate: draft.targetDate,
    savingsAccountId: "savings",
    createdAt: new Date().toISOString(),
  };
  if (useFixtures) {
    saveGoal({ ...fixtureGoal, ...goal, id: FIXTURE_GOAL_ID });
    return delay({ ...fixtureGoal, ...goal, id: FIXTURE_GOAL_ID });
  }
  const res = await fetchWithRetry("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: draft.name,
      targetAmount: draft.targetAmount,
      targetDate: draft.targetDate,
    }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as { goal: Goal; projection: Projection };
  saveGoal(data.goal);
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(
      `polaris-projection-${data.goal.id}`,
      JSON.stringify(data.projection),
    );
  }
  return data.goal;
}

export async function fetchProjection(goalId: string): Promise<Projection> {
  if (useFixtures) {
    return delay({ ...fixtureProjectionForIncome(), goalId });
  }
  const res = await fetchWithRetry(`/api/goals/${goalId}/projection`);
  if (!res.ok) throw new Error(await readApiError(res));
  return (await res.json()) as Projection;
}

export async function fetchRouteEvents(
  goalId: string,
  since: string,
): Promise<RouteEventsResponse> {
  if (useFixtures) return delay(fixtureRouteEvents(since));
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  const res = await fetchWithRetry(`/api/goals/${goalId}/events${qs}`);
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as {
    events: Omit<RouteEventRecord, "id">[];
    projection?: Projection;
    previousWaypoints?: Waypoint[];
  };
  const events: RouteEventRecord[] = data.events.map((event, index) => ({
    ...event,
    id: `${event.type}-${event.description}-${index}`,
    previousWaypoints: data.previousWaypoints,
    projection: data.projection,
  }));
  return { events };
}

export async function fetchPostcard(goalId: string): Promise<PostcardResponse> {
  if (useFixtures) {
    void goalId;
    return delay(getFixturePostcard());
  }
  const res = await fetchWithRetry(`/api/goals/${goalId}/postcard`);
  if (!res.ok) throw new Error(await readApiError(res));
  return (await res.json()) as PostcardResponse;
}

export type RouteChatResult = {
  reply: string;
  /** Set when the message was a purchase that was logged. */
  event: RouteEventRecord | null;
  projection: Projection | null;
};

export async function routeChat(
  goalId: string,
  messages: DestinationChatTurn[],
): Promise<RouteChatResult> {
  if (useFixtures) {
    const last = messages[messages.length - 1]?.content ?? "";
    const today = localIsoDate();
    const expected = parseExpectedMoney(last, today);
    if (expected) {
      if (!expected.date) {
        return delay({
          reply: `Nice! When is ${expected.sender} sending the $${expected.amount.toLocaleString("en-US")}? Tell me the date, like "Oct 15", and I'll add a star for it.`,
          event: null,
          projection: null,
        });
      }
      const { before, after, event } = addFixtureExpectedIncome({
        date: expected.date,
        label: expected.label,
        amount: expected.amount,
        description: "Money from someone",
      });
      const when = formatMonDayYear(expected.date, today);
      const gained =
        before.eta && after.eta
          ? Math.round(
              (Date.parse(`${before.eta}T12:00:00Z`) -
                Date.parse(`${after.eta}T12:00:00Z`)) /
                86400000,
            )
          : 0;
      const impact =
        after.eta && gained > 0
          ? ` Once it lands you arrive ${formatMonDayYear(after.eta, today)}, ${gained} day${gained === 1 ? "" : "s"} sooner.`
          : "";
      return delay({
        reply: `Got it. I added a star on ${when} for the $${expected.amount.toLocaleString("en-US")} ${expected.sender === "they" ? "coming in" : `${expected.sender} is sending`}.${impact}`,
        event,
        projection: after,
      });
    }
    const received = parseReceivedMoney(last);
    if (received) {
      const { before, after, event } = addFixtureIncome({
        date: localIsoDate(),
        label: received.label,
        amount: received.amount,
        description: received.description,
      });
      return delay({
        reply: fixtureIncomeReply(received, before, after),
        event,
        projection: after,
      });
    }
    if (/\$\s*\d/.test(last) && /spent|bought|purchase/i.test(last)) {
      triggerFixturePurchase();
      return delay({
        reply: "Logged it. Watch the route update.",
        event: null,
        projection: null,
      });
    }
    return delay({
      reply:
        'Try "I made $85 in tips at work tonight!" to see a faster route, or tell me about a purchase.',
      event: null,
      projection: null,
    });
  }
  // Not retried: a replayed purchase would be logged twice.
  const res = await polarisFetch(`/api/goals/${goalId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, localDate: localIsoDate() }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as {
    reply: string;
    event: Omit<RouteEventRecord, "id"> | null;
    projection: Projection | null;
  };
  return {
    reply: data.reply,
    event: data.event
      ? {
          ...data.event,
          id: `chat-${crypto.randomUUID()}`,
          projection: data.projection ?? undefined,
        }
      : null,
    projection: data.projection,
  };
}

export async function applyMove(moveId: string): Promise<Projection | null> {
  if (useFixtures) {
    void moveId;
    return delay(null);
  }
  const res = await fetchWithRetry(`/api/moves/${moveId}/apply`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as { projection: Projection | null };
  return data.projection;
}

export async function demoTips(): Promise<void> {
  if (useFixtures) {
    triggerFixtureTips();
    return delay(undefined);
  }
  await fetchWithRetry("/api/demo/tips", { method: "POST" }).catch(() => {
    triggerFixtureTips();
  });
}

export async function demoPurchase(): Promise<void> {
  if (useFixtures) {
    triggerFixturePurchase();
    return delay(undefined);
  }
  const res = await fetchWithRetry("/api/demo/purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchant: "Chipotle", amount: 32.4 }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}

export async function demoReset(): Promise<void> {
  if (useFixtures) {
    resetFixtureScenario();
    resetSeenRouteEvents();
    return delay(undefined);
  }
  const res = await fetchWithRetry("/api/demo/reset", { method: "POST" });
  if (!res.ok) throw new Error(await readApiError(res));
  resetSeenRouteEvents();
}

export async function demoSamPay(): Promise<void> {
  if (useFixtures) {
    triggerFixtureSamPayment();
    return delay(undefined);
  }
  const res = await fetchWithRetry("/api/demo/sam-pay", { method: "POST" });
  if (!res.ok) throw new Error(await readApiError(res));
}

export function projectionKey(goalId: string) {
  return ["projection", goalId] as const;
}

export function eventsKey(goalId: string, since: string) {
  return ["route-events", goalId, since] as const;
}

/** Matches every route-events query for a goal, whatever its `since`. */
export function allEventsKey(goalId: string) {
  return ["route-events", goalId] as const;
}

export function useDemoLogin() {
  return useMutation({ mutationFn: demoLogin });
}

export function useOverview(goalId: string | undefined) {
  return useQuery({
    queryKey: ["overview", goalId],
    queryFn: () => fetchOverview(goalId!),
    enabled: Boolean(goalId),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: { draft: ParsedGoalDraft } | { text: string; skipParse?: boolean },
    ) => {
      if ("draft" in input) return createGoal(input.draft);
      const draft = input.skipParse
        ? ({
            name: input.text,
            targetAmount: 400,
            targetDate: "2026-12-15",
          } as ParsedGoalDraft)
        : await parseGoalText(input.text);
      return createGoal(draft);
    },
    onSuccess: (goal) => {
      const cached =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem(`polaris-projection-${goal.id}`)
          : null;
      if (cached) {
        try {
          qc.setQueryData(
            projectionKey(goal.id),
            JSON.parse(cached) as Projection,
          );
        } catch {
          void qc.invalidateQueries({ queryKey: projectionKey(goal.id) });
        }
      } else {
        void qc.invalidateQueries({ queryKey: projectionKey(goal.id) });
      }
    },
  });
}

export function useProjection(goalId: string | undefined) {
  return useQuery({
    queryKey: projectionKey(goalId ?? ""),
    queryFn: () => fetchProjection(goalId!),
    enabled: Boolean(goalId),
    staleTime: 30_000,
  });
}

const seenEventIds = new Set<string>();

export function resetSeenRouteEvents() {
  seenEventIds.clear();
}

export function useRouteEvents(
  goalId: string | undefined,
  since: string,
  onNewEvents?: (events: RouteEventsResponse["events"]) => void,
) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: eventsKey(goalId ?? "", since),
    queryFn: async () => {
      const data = await fetchRouteEvents(goalId!, since);
      const fresh = data.events.filter((e) => !seenEventIds.has(e.id));
      for (const e of fresh) seenEventIds.add(e.id);
      if (fresh.length > 0) {
        const latest = fresh[fresh.length - 1];
        if (latest.projection) {
          qc.setQueryData(projectionKey(goalId!), latest.projection);
        }
        onNewEvents?.(fresh);
      }
      return data;
    },
    enabled: Boolean(goalId),
    refetchInterval: 5000,
  });
}

export function usePostcard(goalId: string | undefined) {
  return useQuery({
    queryKey: ["postcard", goalId],
    queryFn: () => fetchPostcard(goalId!),
    enabled: Boolean(goalId),
    refetchInterval: (query) =>
      !query.state.data || query.state.data.status === "pending"
        ? 3000
        : false,
  });
}

export function useApplyMove(goalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: applyMove,
    onSuccess: (projection, moveId) => {
      useUIStore.getState().markMoveApplied(moveId);
      if (projection) {
        qc.setQueryData(projectionKey(goalId), projection);
      } else {
        void qc.invalidateQueries({ queryKey: projectionKey(goalId) });
      }
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Couldn't apply that move.");
    },
  });
}

export const demoPersonaName = DEMO_PERSONA.fullName;

export function mergeProjectionCache(qc: QueryClient, goalId: string, p: Projection) {
  qc.setQueryData(projectionKey(goalId), p);
}

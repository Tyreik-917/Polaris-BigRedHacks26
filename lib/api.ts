"use client";

import {
  FIXTURE_GOAL_ID,
  fixtureGoal,
  fixtureOverview,
  getFixturePostcard,
  fixtureProjectionBefore,
  fixtureRouteEvents,
  resetFixtureScenario,
  triggerFixturePurchase,
  triggerFixtureSamPayment,
} from "@/lib/fixtures";
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

async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let last: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await polarisFetch(input, init);
      if (res.ok) return res;
      last = res;
    } catch {
      if (attempt === 0) {
        toast.message("Polaris lost signal, retrying…");
        continue;
      }
      throw new Error("Network error");
    }
    if (attempt === 0) {
      toast.message("Polaris lost signal, retrying…");
    }
  }
  return last!;
}

export async function demoLogin(): Promise<{ customerId: string | null }> {
  if (useFixtures) {
    resetFixtureScenario();
    return delay({ customerId: "maya-demo" });
  }
  const res = await fetchWithRetry("/api/session/demo", { method: "POST" });
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
      name: "Flight home",
      targetAmount: 400,
      targetDate: "2026-12-15",
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
    return delay({ ...fixtureProjectionBefore, goalId });
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

export async function reportPurchase(
  goalId: string,
  text: string,
): Promise<void> {
  if (useFixtures) {
    void goalId;
    void text;
    triggerFixturePurchase();
    return delay(undefined);
  }
  const res = await fetchWithRetry(`/api/goals/${goalId}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}

export async function applyMove(moveId: string): Promise<void> {
  if (useFixtures) {
    void moveId;
    return delay(undefined);
  }
  const res = await fetchWithRetry(`/api/moves/${moveId}/apply`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readApiError(res));
}

export async function demoPurchase(): Promise<void> {
  if (useFixtures) {
    triggerFixturePurchase();
    return delay(undefined);
  }
  await fetchWithRetry("/api/demo/purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchant: "Chipotle", amount: 32.4 }),
  });
}

export async function demoReset(): Promise<void> {
  if (useFixtures) {
    resetFixtureScenario();
    resetSeenRouteEvents();
    return delay(undefined);
  }
  await fetchWithRetry("/api/demo/reset", { method: "POST" });
  resetSeenRouteEvents();
}

export async function demoSamPay(): Promise<void> {
  if (useFixtures) {
    triggerFixtureSamPayment();
    return delay(undefined);
  }
  await fetchWithRetry("/api/demo/sam-pay", { method: "POST" }).catch(() => {
    triggerFixtureSamPayment();
  });
}

export function projectionKey(goalId: string) {
  return ["projection", goalId] as const;
}

export function eventsKey(goalId: string, since: string) {
  return ["route-events", goalId, since] as const;
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
    mutationFn: async (input: { text: string; skipParse?: boolean }) => {
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
      query.state.data?.status === "ready" ? false : 3000,
  });
}

export function useReportPurchase(goalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => reportPurchase(goalId, text),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: eventsKey(goalId, "") });
    },
  });
}

export function useApplyMove(_goalId: string) {
  return useMutation({
    mutationFn: applyMove,
    onSuccess: (_data, moveId) => {
      useUIStore.getState().markMoveApplied(moveId);
    },
  });
}

export const demoPersonaName = DEMO_PERSONA.fullName;

export function mergeProjectionCache(qc: QueryClient, goalId: string, p: Projection) {
  qc.setQueryData(projectionKey(goalId), p);
}

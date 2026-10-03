import { addSeenTransactionIds, getSeenTransactionIds } from "@/lib/goals/store";
import { buildProjectionForGoal } from "@/lib/polaris/build-projection";
import { purchaseDisplayName } from "@/lib/nessie/purchase-detection";
import { loadFinancialSnapshot } from "@/lib/nessie/load-snapshot";
import type { Goal, RouteEvent, Waypoint } from "@/lib/types";

let snapshotCache: {
  customerId: string;
  at: number;
  snapshot: Awaited<ReturnType<typeof loadFinancialSnapshot>>;
} | null = null;

const CACHE_MS = 3_000;

async function cachedSnapshot(customerId: string) {
  const now = Date.now();
  if (
    snapshotCache &&
    snapshotCache.customerId === customerId &&
    now - snapshotCache.at < CACHE_MS
  ) {
    return snapshotCache.snapshot;
  }
  const snapshot = await loadFinancialSnapshot(customerId);
  snapshotCache = { customerId, at: now, snapshot };
  return snapshot;
}

export async function pollGoalEvents(
  goal: Goal,
  since: string | null,
  previousWaypointsOut: { previousWaypoints: Waypoint[] },
): Promise<{
  events: RouteEvent[];
  projection: Awaited<ReturnType<typeof buildProjectionForGoal>>["projection"];
  previousWaypoints: Waypoint[];
}> {
  const { projection: beforeProjection } = await buildProjectionForGoal(goal);
  previousWaypointsOut.previousWaypoints = beforeProjection.waypoints;

  const snapshot = await cachedSnapshot(goal.customerId);
  const seen = new Set(await getSeenTransactionIds(goal.id));
  const events: RouteEvent[] = [];

  const newPurchases = snapshot.purchases.filter(
    (p) => p.id && !seen.has(p.id),
  );
  const newTransfersIn = snapshot.transfers.filter(
    (t) =>
      t.direction === "in" &&
      t.id &&
      !seen.has(`transfer:${t.id}`) &&
      (!since || t.date >= since.slice(0, 10)),
  );

  for (const p of newPurchases) {
    events.push({
      type: "purchase_detected",
      description: purchaseDisplayName(p),
      amount: p.amount,
      previousEta: beforeProjection.eta,
      newEta: null,
    });
    seen.add(p.id);
  }

  for (const t of newTransfersIn) {
    events.push({
      type: "transfer_received",
      description: t.description || "Transfer received",
      amount: t.amount,
      previousEta: beforeProjection.eta,
      newEta: null,
    });
    seen.add(`transfer:${t.id}`);
  }

  const newIds = [
    ...newPurchases.map((p) => p.id),
    ...newTransfersIn.map((t) => `transfer:${t.id}`),
  ];
  if (newIds.length > 0) {
    await addSeenTransactionIds(goal.id, newIds);
  }

  const { projection: afterProjection } =
    events.length > 0
      ? await buildProjectionForGoal(goal)
      : { projection: beforeProjection };

  for (const ev of events) {
    ev.newEta = afterProjection.eta;
  }

  return {
    events,
    projection: afterProjection,
    previousWaypoints: previousWaypointsOut.previousWaypoints,
  };
}

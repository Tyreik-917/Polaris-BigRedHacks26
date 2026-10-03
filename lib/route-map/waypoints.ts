import type { Goal } from "@/lib/goals/types";
import type {
  FinancialSnapshot,
  NormalizedBill,
  ReceivableHint,
} from "@/lib/nessie/types";
import { receivableKey } from "@/lib/p2p/types";
import type { ProjectionResult } from "@/lib/projection/engine";
import { formatProjectionDate } from "@/lib/projection/eta-copy";
import { resolveRouteStartDate } from "@/lib/route-map/timeline";

export type WaypointKind = "bill" | "payday" | "milestone" | "receivable";

export type RouteWaypoint = {
  id: string;
  kind: WaypointKind;
  date: string;
  /** Primary label, e.g. "Phone bill" or "Payday". */
  title: string;
  /** Secondary fragment, e.g. "Oct 12" or "paid". */
  detail: string;
  passed: boolean;
};

function parseDay(iso: string): number {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).getTime();
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isBillPaid(bill: NormalizedBill, todayIso: string): boolean {
  const status = bill.status?.toLowerCase();
  if (status === "paid" || status === "completed") return true;
  return bill.dueDate < todayIso;
}

function billWaypoints(
  bills: NormalizedBill[],
  routeStart: string,
  routeEnd: string,
  todayIso: string,
): RouteWaypoint[] {
  return bills
    .filter((b) => b.dueDate >= routeStart && b.dueDate <= routeEnd)
    .map((b) => {
      const passed = isBillPaid(b, todayIso);
      return {
        id: `bill-${b.id}`,
        kind: "bill" as const,
        date: b.dueDate,
        title: b.payee,
        detail: passed ? "paid" : formatProjectionDate(b.dueDate),
        passed,
      };
    });
}

/** Matches projection engine: paychecks on dayIndex % interval === 0 (not day 0). */
function paydayWaypoints(
  snapshot: FinancialSnapshot,
  anchorIso: string,
  routeStart: string,
  routeEnd: string,
  todayIso: string,
): RouteWaypoint[] {
  const { estimatedPaycheckAmount, paycheckIntervalDays } = snapshot;
  if (estimatedPaycheckAmount <= 0 || paycheckIntervalDays <= 0) return [];

  const out: RouteWaypoint[] = [];
  const endMs = parseDay(routeEnd);
  let dayIndex = 0;
  let dateIso = anchorIso;

  while (parseDay(dateIso) <= endMs) {
    if (
      dateIso >= routeStart &&
      dayIndex > 0 &&
      dayIndex % paycheckIntervalDays === 0
    ) {
      const passed = dateIso < todayIso;
      out.push({
        id: `payday-${dateIso}`,
        kind: "payday",
        date: dateIso,
        title: "Payday",
        detail: passed ? "paid" : formatProjectionDate(dateIso),
        passed,
      });
    }
    dayIndex += 1;
    dateIso = addDaysIso(anchorIso, dayIndex);
  }
  return out;
}

function milestoneAmounts(
  currentSaved: number,
  targetAmount: number,
): number[] {
  const steps = [0.25, 0.5, 0.75].map((p) =>
    Math.round(targetAmount * p),
  );
  const unique = [...new Set(steps)]
    .filter((n) => n > currentSaved && n < targetAmount)
    .sort((a, b) => a - b);
  return unique;
}

function milestoneWaypoints(
  projection: ProjectionResult,
  routeStart: string,
  routeEnd: string,
  todayIso: string,
): RouteWaypoint[] {
  const thresholds = milestoneAmounts(
    projection.currentSaved,
    projection.targetAmount,
  );
  if (thresholds.length === 0) return [];

  const out: RouteWaypoint[] = [];
  const hit = new Set<number>();

  for (const point of projection.dailySeries) {
    if (point.date < routeStart || point.date > routeEnd) continue;
    for (const threshold of thresholds) {
      if (hit.has(threshold)) continue;
      if (point.balance >= threshold) {
        hit.add(threshold);
        const passed = point.date < todayIso;
        out.push({
          id: `milestone-${threshold}-${point.date}`,
          kind: "milestone",
          date: point.date,
          title: `$${threshold.toLocaleString("en-US")} saved`,
          detail: passed ? "reached" : formatProjectionDate(point.date),
          passed,
        });
      }
    }
  }
  return out;
}

function receivableWaypoints(
  receivables: ReceivableHint[],
  collectedKeys: Set<string>,
  routeStart: string,
  routeEnd: string,
  todayIso: string,
): RouteWaypoint[] {
  return receivables.map((r) => {
    const key = receivableKey(r.name, r.amount);
    const collected = collectedKeys.has(key);
    const date =
      todayIso >= routeStart && todayIso <= routeEnd ? todayIso : routeStart;
    return {
      id: `recv-${key}`,
      kind: "receivable" as const,
      date,
      title: `$${r.amount} from ${r.name}`,
      detail: collected ? "collected" : "tap to request",
      passed: collected,
    };
  });
}

const MAX_WAYPOINTS = 14;

export type BuildRouteWaypointsInput = {
  goal: Goal;
  snapshot: FinancialSnapshot;
  projection: ProjectionResult;
  /** Journey start on the star route (defaults from goal / series). */
  seriesStartDate?: string;
  todayIso?: string;
  /** P2P receivables already collected — lights up stars on the route. */
  collectedReceivableKeys?: Set<string> | string[];
  /** Receivable stars (defaults to snapshot.receivables). */
  receivableHints?: ReceivableHint[];
};

export function buildRouteWaypoints({
  goal,
  snapshot,
  projection,
  seriesStartDate,
  todayIso = new Date().toISOString().slice(0, 10),
  collectedReceivableKeys,
  receivableHints,
}: BuildRouteWaypointsInput): RouteWaypoint[] {
  const routeStart = resolveRouteStartDate(goal, seriesStartDate);
  const routeEnd = goal.targetDate.slice(0, 10);
  const anchorIso = todayIso.slice(0, 10);
  const collected =
    collectedReceivableKeys instanceof Set
      ? collectedReceivableKeys
      : new Set(collectedReceivableKeys ?? []);

  const merged = [
    ...billWaypoints(snapshot.bills, routeStart, routeEnd, anchorIso),
    ...paydayWaypoints(snapshot, anchorIso, routeStart, routeEnd, anchorIso),
    ...milestoneWaypoints(projection, routeStart, routeEnd, anchorIso),
    ...receivableWaypoints(
      receivableHints ?? snapshot.receivables,
      collected,
      routeStart,
      routeEnd,
      anchorIso,
    ),
  ];

  merged.sort((a, b) => parseDay(a.date) - parseDay(b.date) || a.id.localeCompare(b.id));

  const seen = new Set<string>();
  const deduped: RouteWaypoint[] = [];
  for (const w of merged) {
    const key = `${w.kind}-${w.date}-${w.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(w);
  }

  return deduped.slice(0, MAX_WAYPOINTS);
}

export function formatWaypointLabel(w: RouteWaypoint): string {
  return `${w.title} · ${w.detail}`;
}

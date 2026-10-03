import type { Goal } from "@/lib/goals/types";

function parseDay(iso: string): number {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).getTime();
}

export function isoTodayLocal(ref: Date = new Date()): string {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/** Calendar progress from journey start to goal date (0 = start, 1 = target). */
export function routeTimelineFraction(
  startIso: string,
  targetIso: string,
  todayIso: string,
): number {
  const start = parseDay(startIso);
  const target = parseDay(targetIso);
  const today = parseDay(todayIso);
  const total = target - start;
  if (total <= 0) return today >= target ? 1 : 0;
  const elapsed = today - start;
  return Math.min(1, Math.max(0, elapsed / total));
}

export function resolveRouteStartDate(
  goal: Pick<Goal, "startDate" | "targetDate">,
  fallbackIso?: string,
): string {
  if (goal.startDate) return goal.startDate.slice(0, 10);
  if (fallbackIso) return fallbackIso.slice(0, 10);
  return isoTodayLocal();
}

export function pointAlongLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
): { x: number; y: number } {
  const u = Math.min(1, Math.max(0, t));
  return {
    x: x1 + (x2 - x1) * u,
    y: y1 + (y2 - y1) * u,
  };
}

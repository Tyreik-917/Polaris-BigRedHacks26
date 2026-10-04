import type { Goal, Waypoint } from "@/lib/types";

export const MAP = {
  width: 390,
  height: 400,
  start: { x: 48, y: 350 },
  goal: { x: 320, y: 62 },
} as const;

/** Most checkpoints drawn between "You" and the goal; more than this gets cluttered. */
const MAX_CHECKPOINTS = 4;
/** Most "money received" stars drawn at once (the latest ones). */
const MAX_NEW_MONEY_STARS = 3;
/** Minimum spacing between markers, as a fraction of the route. */
const MIN_GAP = 0.13;

export type Pt = { x: number; y: number };
/** Cubic Bézier: start, two control points, end. */
export type RouteCurve = [Pt, Pt, Pt, Pt];

export type MapPoint = {
  x: number;
  y: number;
  /** Position along the route, 0 (start) to 1 (goal). */
  t: number;
  waypoint: Waypoint;
  index: number;
};

/**
 * One smooth S-curve from start (bottom-left) to the goal star (top-right).
 * `bend` scales how far it sweeps; the pre-reroute route uses a flatter bend.
 */
export function routeCurve(bend = 1): RouteCurve {
  const s = MAP.start;
  const g = MAP.goal;
  return [
    { x: s.x, y: s.y },
    { x: s.x + 170 * bend, y: s.y },
    { x: g.x - 170 * bend, y: g.y + 40 },
    { x: g.x, y: g.y },
  ];
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function pointOnCurve([p0, p1, p2, p3]: RouteCurve, t: number): Pt {
  const a = lerp(p0, p1, t);
  const b = lerp(p1, p2, t);
  const c = lerp(p2, p3, t);
  return lerp(lerp(a, b, t), lerp(b, c, t), t);
}

/** Unit normal on the left of the direction of travel (labels sit here). */
export function normalOnCurve([p0, p1, p2, p3]: RouteCurve, t: number): Pt {
  const u = 1 - t;
  const dx =
    3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
  const dy =
    3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
  const len = Math.hypot(dx, dy) || 1;
  return { x: dy / len, y: -dx / len };
}

/** De Casteljau split at t → [start…t, t…end]. */
export function splitCurve(
  [p0, p1, p2, p3]: RouteCurve,
  t: number,
): [RouteCurve, RouteCurve] {
  const a = lerp(p0, p1, t);
  const b = lerp(p1, p2, t);
  const c = lerp(p2, p3, t);
  const d = lerp(a, b, t);
  const e = lerp(b, c, t);
  const m = lerp(d, e, t);
  return [
    [p0, a, d, m],
    [m, e, c, p3],
  ];
}

/**
 * The rerouted path: leaves "You" climbing early and meets the goal star from
 * the left, so it reads as a different route from the original S-curve.
 */
export function rerouteCurve(): RouteCurve {
  const s = MAP.start;
  const g = MAP.goal;
  return [
    { x: s.x, y: s.y },
    { x: s.x + 30, y: s.y - 170 },
    { x: g.x - 170, y: g.y + 20 },
    { x: g.x, y: g.y },
  ];
}

export function curveToPath([p0, p1, p2, p3]: RouteCurve): string {
  const f = (p: Pt) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  return `M${f(p0)} C${f(p1)} ${f(p2)} ${f(p3)}`;
}

function localIsoDate(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return timestamp.slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pickEvenly<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  return Array.from(
    { length: max },
    (_, i) => items[Math.round((i * (items.length - 1)) / (max - 1))],
  );
}

/**
 * Start → checkpoints → You → checkpoints → goal, keeping only checkpoints that
 * fall inside the trip (anything after the goal date would pile up on the star).
 * "Start" is dropped when the trip began today, since it would sit on "You".
 */
export function enrichWaypointsForMap(
  waypoints: Waypoint[],
  goal: Goal,
  todayIso: string,
  endDate: string,
): Waypoint[] {
  // Local calendar day: slicing the UTC timestamp jumps to "tomorrow" in US evenings.
  const startDate = localIsoDate(goal.createdAt);
  const skip = new Set(["Start", "You", goal.name]);

  // Money the user reported receiving (or income landing today) sits just past
  // "You", lit. Only the latest few are drawn so the route stays readable.
  const isNewMoney = (w: Waypoint) =>
    w.reported === true || (w.date === todayIso && w.kind === "income");
  const newMoney = waypoints
    .filter((w) => !skip.has(w.label) && isNewMoney(w))
    .slice(-MAX_NEW_MONEY_STARS)
    .map((w) => ({ ...w, status: "passed" as const }));

  const inTrip = [...waypoints]
    .filter(
      (w) =>
        !skip.has(w.label) &&
        !isNewMoney(w) &&
        w.date > startDate &&
        // Promised money arriving on the last day of the trip still gets its star.
        (w.date < endDate || (w.expected === true && w.date <= endDate)),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({
      ...w,
      status: (w.date < todayIso ? "passed" : "upcoming") as Waypoint["status"],
    }));

  const beforeYou = pickEvenly(
    inTrip.filter((w) => w.date <= todayIso),
    2,
  );
  // Promised money always gets its star. The first new-money and first promised
  // star are free; each extra one takes the place of a regular checkpoint (keep
  // at least 2). Then everything goes back into date order.
  const ahead = inTrip.filter((w) => w.date > todayIso);
  const promised = ahead.filter((w) => w.expected).slice(0, MAX_NEW_MONEY_STARS);
  const regular = pickEvenly(
    ahead.filter((w) => !w.expected),
    Math.max(
      2,
      MAX_CHECKPOINTS -
        Math.max(0, newMoney.length - 1) -
        Math.max(0, promised.length - 1),
    ),
  );
  const afterYou = [...promised, ...regular].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const start: Waypoint = {
    date: startDate,
    label: "Start",
    kind: "milestone",
    amount: 0,
    status: "passed",
  };
  const you: Waypoint = {
    date: todayIso,
    label: "You",
    kind: "milestone",
    amount: 0,
    status: "upcoming",
  };
  const goalWp: Waypoint = {
    date: goal.targetDate,
    label: goal.name,
    kind: "milestone",
    amount: goal.targetAmount,
    status: "upcoming",
  };

  const head = startDate < todayIso ? [start, ...beforeYou] : [];
  return [...head, you, ...newMoney, ...afterYou, goalWp];
}

/** Places waypoints on the curve by date, nudged apart so markers never overlap. */
export function layoutWaypoints(
  waypoints: Waypoint[],
  startDate: string,
  endDate: string,
  curve: RouteCurve = routeCurve(),
): MapPoint[] {
  const startMs = new Date(`${startDate}T12:00:00`).getTime();
  const endMs = new Date(`${endDate}T12:00:00`).getTime();
  const span = Math.max(endMs - startMs, 1);
  const last = waypoints.length - 1;

  const ts = waypoints.map((w, i) => {
    if (i === 0) return 0;
    if (i === last) return 1;
    const tMs = new Date(`${w.date}T12:00:00`).getTime();
    return Math.min(1, Math.max(0, (tMs - startMs) / span));
  });

  // Forward pass pushes markers apart; backward pass keeps them before the goal.
  for (let i = 1; i < ts.length; i++) ts[i] = Math.max(ts[i], ts[i - 1] + MIN_GAP);
  ts[last] = 1;
  for (let i = last - 1; i > 0; i--) ts[i] = Math.min(ts[i], ts[i + 1] - MIN_GAP);

  return waypoints.map((waypoint, index) => {
    const t = Math.max(0, ts[index]);
    const p = pointOnCurve(curve, t);
    return { x: p.x, y: p.y, t, waypoint, index };
  });
}

export const STAR_FIELD_DOTS: { x: number; y: number; r: number }[] = [
  { x: 32, y: 48, r: 1.2 },
  { x: 88, y: 92, r: 1 },
  { x: 310, y: 160, r: 1.3 },
  { x: 365, y: 120, r: 1 },
  { x: 120, y: 180, r: 1.1 },
  { x: 280, y: 220, r: 1 },
  { x: 60, y: 260, r: 1.2 },
  { x: 230, y: 140, r: 1 },
  { x: 365, y: 260, r: 1.1 },
  { x: 150, y: 40, r: 1 },
  { x: 250, y: 270, r: 1.2 },
  { x: 48, y: 160, r: 1 },
  { x: 330, y: 200, r: 1 },
  { x: 18, y: 330, r: 1.1 },
  { x: 220, y: 28, r: 1.3 },
];

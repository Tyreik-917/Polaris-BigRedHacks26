import type { Goal, Waypoint } from "@/lib/types";

export const MAP = {
  width: 390,
  height: 400,
  start: { x: 40, y: 360 },
  goal: { x: 250, y: 70 },
} as const;

const OFFSETS = [0, -55, 60, -45, 50, -65, 55, -40, 45];

export type MapPoint = {
  x: number;
  y: number;
  waypoint: Waypoint;
  index: number;
};

/** Ensures Start, You, and goal markers exist for map routing (live API omits these). */
export function enrichWaypointsForMap(
  waypoints: Waypoint[],
  goal: Goal,
  todayIso: string,
): Waypoint[] {
  const skip = new Set(["Start", "You", goal.name]);
  const sorted = [...waypoints]
    .filter((w) => !skip.has(w.label))
    .sort((a, b) => a.date.localeCompare(b.date));

  const start: Waypoint = {
    date: goal.createdAt.slice(0, 10),
    label: "Start",
    kind: "milestone",
    amount: 0,
    status: "passed",
  };

  const middle = sorted.map((w) => ({
    ...w,
    status: (w.date < todayIso ? "passed" : "upcoming") as Waypoint["status"],
  }));

  const beforeYou = middle.filter((w) => w.date <= todayIso);
  const afterYou = middle.filter((w) => w.date > todayIso);

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

  return [start, ...beforeYou, you, ...afterYou, goalWp];
}

export function layoutWaypoints(
  waypoints: Waypoint[],
  startDate: string,
  endDate: string,
): MapPoint[] {
  const startMs = new Date(`${startDate}T12:00:00`).getTime();
  const endMs = new Date(`${endDate}T12:00:00`).getTime();
  const span = Math.max(endMs - startMs, 1);
  const last = waypoints.length - 1;

  return waypoints.map((waypoint, index) => {
    if (index === 0) {
      return { x: MAP.start.x, y: MAP.start.y, waypoint, index };
    }
    if (index === last) {
      return { x: MAP.goal.x, y: MAP.goal.y, waypoint, index };
    }

    const tMs = new Date(`${waypoint.date}T12:00:00`).getTime();
    const t = Math.min(1, Math.max(0, (tMs - startMs) / span));
    const y = MAP.start.y - t * (MAP.start.y - MAP.goal.y);
    const centerX = (MAP.start.x + MAP.goal.x) / 2;
    const offset = OFFSETS[index % OFFSETS.length] ?? 0;
    const x = centerX + offset;
    return { x, y, waypoint, index };
  });
}

export const STAR_FIELD_DOTS: { x: number; y: number; r: number }[] = [
  { x: 32, y: 48, r: 1.2 },
  { x: 88, y: 92, r: 1 },
  { x: 310, y: 56, r: 1.3 },
  { x: 350, y: 120, r: 1 },
  { x: 120, y: 180, r: 1.1 },
  { x: 280, y: 220, r: 1 },
  { x: 60, y: 260, r: 1.2 },
  { x: 200, y: 140, r: 1 },
  { x: 340, y: 320, r: 1.1 },
  { x: 150, y: 40, r: 1 },
  { x: 220, y: 310, r: 1.2 },
  { x: 48, y: 120, r: 1 },
  { x: 300, y: 160, r: 1 },
  { x: 180, y: 350, r: 1.1 },
  { x: 260, y: 28, r: 1.3 },
];

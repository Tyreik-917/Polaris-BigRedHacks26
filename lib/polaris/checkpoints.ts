import type { FinancialSnapshot } from "@/lib/nessie/types";
import type { Goal, Projection, Waypoint, WaypointCheckpoint } from "@/lib/types";

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function starsBeforeGoal(waypoints: Waypoint[], targetDate: string): Waypoint[] {
  return waypoints
    .filter(
      (w) =>
        w.date <= targetDate &&
        (w.kind === "bill" || w.kind === "income") &&
        w.label !== "Halfway there",
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

function fmtBillLabel(payee: string, date: string): string {
  const d = new Date(`${date}T12:00:00`);
  const mon = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  return `${payee} · ${mon} ${day}`;
}

export function buildCheckpointDetail(
  waypoint: Waypoint,
  goal: Goal,
  projection: Projection,
  snapshot: FinancialSnapshot,
): WaypointCheckpoint {
  const stars = starsBeforeGoal(projection.waypoints, goal.targetDate);
  const index = Math.max(
    0,
    stars.findIndex(
      (w) => w.date === waypoint.date && w.label === waypoint.label,
    ),
  );
  const checkpointIndex = index >= 0 ? index + 1 : 1;
  const checkpointTotal = Math.max(stars.length, 4);

  const nextStar = stars[index + 1];
  const weeklyFood =
    snapshot.avgDailyFoodSpend > 0
      ? snapshot.avgDailyFoodSpend * 7
      : 45;

  const comingIn: { label: string; amount: number }[] = [];
  const dueBeforeNext: { label: string; amount: number }[] = [];

  if (waypoint.kind === "income") {
    if (/tip/i.test(waypoint.label)) {
      comingIn.push({
        label: `${waypoint.label} · campus job`,
        amount: Math.abs(waypoint.amount),
      });
    } else {
      comingIn.push({
        label: "Paycheck · campus job",
        amount: Math.abs(waypoint.amount),
      });
    }
  }

  if (waypoint.kind === "bill") {
    dueBeforeNext.push({
      label: waypoint.label,
      amount: Math.abs(waypoint.amount),
    });
  }

  if (nextStar?.kind === "bill") {
    dueBeforeNext.push({
      label: fmtBillLabel(nextStar.label, nextStar.date),
      amount: Math.abs(nextStar.amount),
    });
  }

  if (waypoint.kind === "income" && nextStar?.kind === "bill") {
    dueBeforeNext.length = 0;
    dueBeforeNext.push({
      label: fmtBillLabel(nextStar.label, nextStar.date),
      amount: Math.abs(nextStar.amount),
    });
  }

  if (
    waypoint.date.startsWith("2026-11-21") ||
    (waypoint.label === "Payday" && waypoint.date.includes("-11-21"))
  ) {
    dueBeforeNext.push(
      { label: "Spotify · Nov 20", amount: 11 },
      { label: "Groceries (estimated)", amount: weeklyFood },
    );
  }

  const progressRatio =
    checkpointTotal > 0 ? checkpointIndex / checkpointTotal : 0.5;
  const savedTowardGoal = Math.min(
    goal.targetAmount,
    Math.round(goal.targetAmount * progressRatio * 0.85 + projection.saved * 0.15),
  );

  let inspireLine = "Keep following the stars toward your goal.";
  if (/tip/i.test(waypoint.label)) {
    inspireLine = "Tonight's tips moved your arrival sooner.";
  } else if (waypoint.kind === "income") {
    inspireLine = "Every paycheck is a step toward $1,000.";
  } else if (/rent/i.test(waypoint.label)) {
    inspireLine = "Rent clears and you keep moving.";
  } else if (checkpointIndex >= checkpointTotal - 1) {
    inspireLine = "Over halfway to $1,000. Keep going.";
  }

  return {
    checkpointIndex,
    checkpointTotal,
    imagineUrl: goal.postcardUrl,
    inspireLine,
    comingIn: comingIn.length ? comingIn : undefined,
    dueBeforeNext: dueBeforeNext.length ? dueBeforeNext : undefined,
    savedTowardGoal,
  };
}

/** Saved trajectory at a star date (interpolated from projection). */
export function savedAtStarDate(
  projection: Projection,
  starDate: string,
  goal: Goal,
): number {
  const stars = starsBeforeGoal(projection.waypoints, goal.targetDate);
  const idx = stars.findIndex((s) => s.date === starDate);
  if (idx < 0) return projection.saved;
  const frac = (idx + 1) / Math.max(stars.length, 1);
  return Math.min(
    goal.targetAmount,
    Math.round(projection.saved + (goal.targetAmount - projection.saved) * frac * 0.4),
  );
}

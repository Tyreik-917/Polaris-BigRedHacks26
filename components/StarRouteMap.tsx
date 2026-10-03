"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Goal } from "@/lib/goals/types";
import type {
  FinancialSnapshot,
  ReceivableHint,
} from "@/lib/nessie/types";
import type { ProjectionResult } from "@/lib/projection/engine";
import { formatProjectionDate } from "@/lib/projection/eta-copy";
import {
  isoTodayLocal,
  pointAlongLine,
  resolveRouteStartDate,
  routeTimelineFraction,
} from "@/lib/route-map/timeline";
import {
  buildRouteWaypoints,
  formatWaypointLabel,
  type RouteWaypoint,
} from "@/lib/route-map/waypoints";
import {
  GoalStarPostcardPin,
  postcardBlurFilterDef,
} from "@/components/GoalStarPostcardPin";
import { postcardProgressStyle } from "@/lib/imagine/postcard-visual";
import { cn } from "@/lib/utils";
import { ReroutingBadge } from "@/components/ReroutingBadge";
import { useMemo } from "react";

type Props = {
  goal: Goal;
  /** First date in projection series — fallback when older goals lack startDate */
  seriesStartDate?: string;
  snapshot?: FinancialSnapshot | null;
  projection?: ProjectionResult | null;
  /** Prior projection kept during / after reroute for gray vs gold comparison */
  previousProjection?: ProjectionResult | null;
  rerouting?: boolean;
  imagineUrl?: string | null;
  imaginePending?: boolean;
  todayIso?: string;
  collectedReceivableKeys?: Set<string>;
  receivableHints?: ReceivableHint[];
  className?: string;
};

const W = 360;
const H = 200;
const START = { x: 52, y: 158 };
const GOAL = { x: 308, y: 42 };
const POSTCARD = { w: 72, h: 54, x: GOAL.x - 72 - 14, y: GOAL.y - 6 };

function offsetSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offset: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * offset;
  const ny = (dx / len) * offset;
  return { x1: x1 + nx, y1: y1 + ny, x2: x2 + nx, y2: y2 + ny };
}

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 2) * -1 + (i * Math.PI) / 5;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function WaypointStar({
  waypoint,
  x,
  y,
  labelBelow,
}: {
  waypoint: RouteWaypoint;
  x: number;
  y: number;
  labelBelow: boolean;
}) {
  const outer = 8;
  const inner = 3.5;
  const label = formatWaypointLabel(waypoint);
  const labelY = labelBelow ? y + 16 : y - 11;

  return (
    <g aria-label={label}>
      {waypoint.passed ? (
        <polygon
          points={starPoints(x, y, outer, inner)}
          fill="#fcd34d"
          stroke="#f59e0b"
          strokeWidth={0.75}
        />
      ) : (
        <polygon
          points={starPoints(x, y, outer, inner)}
          fill="transparent"
          stroke="#fde68a"
          strokeWidth={1.25}
        />
      )}
      <text
        x={x}
        y={labelY}
        textAnchor="middle"
        className={cn(
          "text-[9px]",
          waypoint.passed ? "fill-amber-200/95" : "fill-slate-400",
        )}
      >
        {label}
      </text>
    </g>
  );
}

export function StarRouteMap({
  goal,
  seriesStartDate,
  snapshot,
  projection,
  previousProjection,
  rerouting,
  imagineUrl,
  imaginePending,
  todayIso,
  collectedReceivableKeys,
  receivableHints,
  className,
}: Props) {
  const progressPercent = projection?.progressPercent ?? 0;
  const { blurPx } = postcardProgressStyle(progressPercent);
  const blurStd = blurPx * 0.35;
  const today = todayIso ?? isoTodayLocal();
  const startDate = resolveRouteStartDate(goal, seriesStartDate);
  const timelineT = routeTimelineFraction(startDate, goal.targetDate, today);
  const youAreHere = pointAlongLine(
    START.x,
    START.y,
    GOAL.x,
    GOAL.y,
    timelineT,
  );

  const waypoints = useMemo(() => {
    if (!snapshot || !projection) return [];
    return buildRouteWaypoints({
      goal,
      snapshot,
      projection,
      seriesStartDate,
      todayIso: today,
      collectedReceivableKeys,
      receivableHints,
    });
  }, [
    goal,
    snapshot,
    projection,
    seriesStartDate,
    today,
    collectedReceivableKeys,
    receivableHints,
  ]);

  const bgStars = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        x: ((i * 47) % 97) / 100,
        y: ((i * 31) % 89) / 100,
        r: 0.6 + (i % 3) * 0.35,
        o: 0.15 + (i % 5) * 0.08,
      })),
    [],
  );

  const startLabel = `Start (${formatProjectionDate(startDate)})`;
  const goalLabel = `$${goal.targetAmount} · ${formatProjectionDate(goal.targetDate)}`;

  const showRouteComparison =
    Boolean(previousProjection && projection && !rerouting) &&
    previousProjection!.etaDate !== projection!.etaDate;

  const activeRoute = offsetSegment(START.x, START.y, GOAL.x, GOAL.y, 0);
  const oldRoute = offsetSegment(START.x, START.y, GOAL.x, GOAL.y, -4);
  const newRoute = offsetSegment(START.x, START.y, GOAL.x, GOAL.y, 4);

  return (
    <Card className={cn("border-slate-800 bg-slate-950/80", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Follow the stars</CardTitle>
            <CardDescription>
              Waypoints mark bills, paydays, and savings milestones from Nessie.
              {showRouteComparison
                ? " Gray is your previous route; gold is the recalculated path to the same goal."
                : " Passed checkpoints turn solid gold; upcoming ones stay outlined."}
            </CardDescription>
          </div>
          {rerouting && <ReroutingBadge />}
        </div>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto w-full max-w-md"
          role="img"
          aria-label={`Star route from ${startLabel} to ${goalLabel}. You are here on ${formatProjectionDate(today)}.`}
        >
          <defs>
            <radialGradient id="goalStarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff7d6" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#fcd34d" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="todayGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0" />
            </radialGradient>
            <clipPath id="goalPostcardClip">
              <rect
                x={POSTCARD.x}
                y={POSTCARD.y}
                width={POSTCARD.w}
                height={POSTCARD.h}
                rx={4}
              />
            </clipPath>
            {postcardBlurFilterDef("goalPostcardBlur", blurStd)}
          </defs>
          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            rx={12}
            fill="#020617"
          />
          {bgStars.map((s, i) => (
            <circle
              key={i}
              cx={16 + s.x * (W - 32)}
              cy={12 + s.y * (H - 24)}
              r={s.r}
              fill="#94a3b8"
              opacity={s.o}
            />
          ))}
          {showRouteComparison ? (
            <>
              <line
                x1={oldRoute.x1}
                y1={oldRoute.y1}
                x2={oldRoute.x2}
                y2={oldRoute.y2}
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray="6 5"
                strokeLinecap="round"
                opacity={0.75}
              />
              <line
                x1={newRoute.x1}
                y1={newRoute.y1}
                x2={newRoute.x2}
                y2={newRoute.y2}
                stroke="#fbbf24"
                strokeWidth={2.25}
                strokeLinecap="round"
                opacity={0.95}
              />
            </>
          ) : (
            <line
              x1={activeRoute.x1}
              y1={activeRoute.y1}
              x2={activeRoute.x2}
              y2={activeRoute.y2}
              stroke={rerouting ? "#64748b" : "#fbbf24"}
              strokeWidth={1.75}
              strokeDasharray={rerouting ? "7 6" : undefined}
              strokeLinecap="round"
              opacity={0.9}
            />
          )}
          {waypoints.map((w, i) => {
            const t = routeTimelineFraction(
              startDate,
              goal.targetDate,
              w.date,
            );
            const { x, y } = pointAlongLine(
              START.x,
              START.y,
              GOAL.x,
              GOAL.y,
              t,
            );
            return (
              <WaypointStar
                key={w.id}
                waypoint={w}
                x={x}
                y={y}
                labelBelow={i % 2 === 0}
              />
            );
          })}
          <circle
            cx={START.x}
            cy={START.y}
            r={5}
            fill="#475569"
            stroke="#94a3b8"
            strokeWidth={1}
          />
          <text
            x={START.x}
            y={START.y + 22}
            textAnchor="middle"
            className="fill-slate-400 text-[11px]"
          >
            {startLabel}
          </text>
          <GoalStarPostcardPin
            x={POSTCARD.x}
            y={POSTCARD.y}
            width={POSTCARD.w}
            height={POSTCARD.h}
            label={goal.label}
            imageUrl={imagineUrl}
            progressPercent={progressPercent}
            pending={imaginePending}
            clipPathUrl="url(#goalPostcardClip)"
            filterUrl="url(#goalPostcardBlur)"
          />
          <circle cx={GOAL.x} cy={GOAL.y} r={22} fill="url(#goalStarGlow)" />
          <polygon
            points={starPoints(GOAL.x, GOAL.y, 14, 6)}
            fill="#fef3c7"
            stroke="#fde68a"
            strokeWidth={0.75}
          />
          <text
            x={GOAL.x}
            y={GOAL.y + 28}
            textAnchor="middle"
            className="fill-amber-100/90 text-[11px] font-medium"
          >
            {goalLabel}
          </text>
          <circle
            cx={youAreHere.x}
            cy={youAreHere.y}
            r={10}
            fill="url(#todayGlow)"
            opacity={0.85}
          />
          <circle
            cx={youAreHere.x}
            cy={youAreHere.y}
            r={5}
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth={1}
          />
          <text
            x={youAreHere.x}
            y={youAreHere.y - 14}
            textAnchor="middle"
            className="fill-slate-200 text-[10px]"
          >
            Today
          </text>
        </svg>
      </CardContent>
    </Card>
  );
}

"use client";

import { NextMoveCallout } from "@/components/NextMoveCallout";
import type { Goal, Projection, Waypoint } from "@/lib/types";
import {
  curveToPath,
  enrichWaypointsForMap,
  layoutWaypoints,
  MAP,
  normalOnCurve,
  routeCurve,
  splitCurve,
  STAR_FIELD_DOTS,
  type MapPoint,
} from "@/lib/map-coords";
import { formatMonDay, formatUsd } from "@/lib/format";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";

type Props = {
  goal: Goal;
  projection: Projection;
  previousWaypoints?: Waypoint[] | null;
  reroutePhase?: "none" | "fade" | "draw" | "done";
  postcardUrl?: string;
  postcardPending?: boolean;
  onWaypointOpen?: (waypoint: Waypoint) => void;
  nextMove?: Projection["nextMove"];
  onSpeakNextMove?: () => void;
};

function starPath(cx: number, cy: number, outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function labelForWaypoint(w: Waypoint): string {
  if (w.status === "passed" && w.kind === "bill") {
    return `${w.label} · paid`;
  }
  return `${w.label} · ${formatMonDay(w.date)}`;
}

const ROUTE = routeCurve(1);

const LABEL_OFFSET = 16;
const LABEL_CHAR_WIDTH = 6.2;

/** Label on the left of travel, anchored away from the path and kept on-canvas. */
function labelPlacement(pt: MapPoint, text: string) {
  const n = normalOnCurve(ROUTE, pt.t);
  const anchor: "start" | "middle" | "end" =
    Math.abs(n.x) < 0.35 ? "middle" : n.x > 0 ? "start" : "end";
  const width = text.length * LABEL_CHAR_WIDTH;
  let x = pt.x + n.x * LABEL_OFFSET;
  const left = anchor === "end" ? x - width : anchor === "middle" ? x - width / 2 : x;
  if (left < 6) x += 6 - left;
  if (left + width > MAP.width - 6) x -= left + width - (MAP.width - 6);
  return { x, y: pt.y + n.y * LABEL_OFFSET + 4, anchor };
}

function todayIsoLocal(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function StarMap({
  goal,
  projection,
  previousWaypoints,
  reroutePhase = "none",
  postcardUrl,
  postcardPending,
  onWaypointOpen,
  nextMove,
  onSpeakNextMove,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [introDone, setIntroDone] = useState(false);
  const todayIso = todayIsoLocal();

  // A late ETA stretches the trip; with no ETA, the route ends at the target date.
  const endDate =
    projection.eta && projection.eta > goal.targetDate
      ? projection.eta
      : goal.targetDate;
  const routeWaypoints = useMemo(
    () => enrichWaypointsForMap(projection.waypoints, goal, todayIso, endDate),
    [projection.waypoints, goal, todayIso, endDate],
  );

  const startDate = routeWaypoints[0]?.date ?? todayIso;

  const points = useMemo(
    () => layoutWaypoints(routeWaypoints, startDate, endDate, ROUTE),
    [routeWaypoints, startDate, endDate],
  );

  const youIndex = points.findIndex((p) => p.waypoint.label === "You");
  const youPoint = points[Math.max(0, youIndex)];
  const youT = youPoint?.t ?? 0;

  const [passedCurve, aheadCurve] = splitCurve(ROUTE, youT);
  const passedPath = youT > 0 ? curveToPath(passedCurve) : null;
  const aheadPath = curveToPath(aheadCurve);
  // Before the reroute the way ahead was more direct: a wider, gentler arc from
  // You that still meets the star from the left (clear of the postcard below it).
  const oldAheadPath =
    previousWaypoints?.length && youPoint
      ? curveToPath([
          youPoint,
          { x: youPoint.x + 170, y: youPoint.y - 20 },
          { x: MAP.goal.x - 110, y: MAP.goal.y + 10 },
          MAP.goal,
        ])
      : null;

  const showLegend = reroutePhase !== "none" && oldAheadPath;
  const oldGray =
    reroutePhase === "fade" ||
    reroutePhase === "draw" ||
    reroutePhase === "done";

  const mapSummary = `Route to ${goal.name}, ${points.filter((p) => p.waypoint.status === "passed").length} of ${points.length} checkpoints passed, ETA ${projection.eta ? formatMonDay(projection.eta) : "unknown"}`;

  // The S-curve leaves the bottom-right corner empty; park the callout there.
  const calloutX = MAP.width - 176;
  const calloutY = MAP.height - 92;

  return (
    <div className="relative h-full min-h-[240px] flex-1 bg-sky">
      <svg
        viewBox={`0 0 ${MAP.width} ${MAP.height}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={mapSummary}
      >
        <rect width={MAP.width} height={MAP.height} fill="#0D1430" />
        {STAR_FIELD_DOTS.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={d.r * 1.8}
            fill="#E8ECF7"
            opacity={0.45}
          />
        ))}

        <text
          x={16}
          y={24}
          fill="#A9B1CC"
          fontSize={12}
          letterSpacing="1.2"
          style={{ textTransform: "uppercase" }}
        >
          Follow the stars
        </text>
        <text x={16} y={40} fill="#A9B1CC" fontSize={11} opacity={0.85}>
          Tap a star for details
        </text>

        {showLegend && (
          <g transform="translate(16, 36)">
            <circle cx={6} cy={6} r={3} fill="#5A6694" />
            <text x={14} y={10} fill="#A9B1CC" fontSize={11}>
              Original route
            </text>
            <circle cx={6} cy={22} r={3} fill="#F5C451" />
            <text x={14} y={26} fill="#A9B1CC" fontSize={11}>
              New route
            </text>
          </g>
        )}

        {oldGray && oldAheadPath && (
          <motion.path
            d={oldAheadPath}
            fill="none"
            stroke="#5A6694"
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0.85 }}
            transition={{ duration: reduceMotion ? 0 : 0.3 }}
          />
        )}

        {passedPath && (
          <motion.path
            d={passedPath}
            fill="none"
            stroke="#F5C451"
            strokeWidth={3.5}
            strokeLinecap="round"
            initial={
              reduceMotion
                ? { pathLength: 1 }
                : { pathLength: 0, opacity: 0.6 }
            }
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 1.2, ease: "easeInOut" }}
            onAnimationComplete={() => setIntroDone(true)}
          />
        )}

        {aheadPath && (
          <motion.path
            d={aheadPath}
            fill="none"
            stroke="#F5C451"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeDasharray="2 8"
            initial={
              reduceMotion
                ? { pathLength: 1 }
                : { pathLength: reroutePhase === "draw" ? 0 : 1 }
            }
            animate={{ pathLength: 1 }}
            transition={{
              duration: reduceMotion || reroutePhase !== "draw" ? 0 : 1.2,
              ease: "easeInOut",
              delay: reroutePhase === "draw" ? 0.3 : 0.8,
            }}
          />
        )}

        {points.map((pt, i) => {
          const w = pt.waypoint;
          const isStart = w.label === "Start";
          const isGoal =
            w.label === goal.name && w.date === goal.targetDate;
          const isYou = w.label === "You";
          const lit =
            introDone || reduceMotion
              ? w.status === "passed" || isYou
              : w.status === "passed";

          if (isStart) {
            return (
              <g key={`${w.date}-${w.label}`}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={6}
                  fill="none"
                  stroke="#E8ECF7"
                  strokeWidth={2}
                />
                <text
                  x={pt.x + 10}
                  y={pt.y + 4}
                  fill="#A9B1CC"
                  fontSize={12}
                >
                  Start
                </text>
              </g>
            );
          }

          if (isGoal) {
            return (
              <g key={`${w.date}-${w.label}`}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={28}
                  fill="#F5C451"
                  opacity={0.18}
                />
                <polygon
                  points={starPath(pt.x, pt.y, 22, 10)}
                  fill="#F5C451"
                />
                <foreignObject
                  x={pt.x - 47}
                  y={pt.y + 30}
                  width={94}
                  height={84}
                >
                  <div className="flex flex-col items-center">
                    {postcardPending || !postcardUrl ? (
                      <div className="h-[62px] w-[94px] rounded-lg border border-dashed border-border bg-panel/80" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={postcardUrl}
                        alt=""
                        className="h-[62px] w-[94px] rounded-lg object-cover"
                      />
                    )}
                    <p className="mt-1 text-[11px] tabular-nums text-ink">
                      {formatUsd(goal.targetAmount)} ·{" "}
                      {formatMonDay(goal.targetDate)}
                    </p>
                  </div>
                </foreignObject>
              </g>
            );
          }

          const labelText = labelForWaypoint(w);
          const label = labelPlacement(pt, labelText);

          return (
            <g key={`${w.date}-${w.label}-${i}`}>
              {/* <button> isn't an SVG element and renders nothing here; use an accessible <g>. */}
              <g
                role="button"
                tabIndex={0}
                className="cursor-pointer focus:outline-none"
                aria-label={isYou ? "You are here" : labelText}
                onClick={() => onWaypointOpen?.(w)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onWaypointOpen?.(w);
                  }
                }}
              >
                {isYou ? (
                  <>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={14}
                      fill="#F5A372"
                      opacity={reroutePhase !== "none" ? 0.35 : 0.22}
                      className={reduceMotion ? undefined : "animate-pulse"}
                    />
                    <circle cx={pt.x} cy={pt.y} r={7} fill="#E8ECF7" />
                  </>
                ) : (
                  <polygon
                    points={starPath(pt.x, pt.y, lit ? 11 : 10, lit ? 5 : 4.5)}
                    fill={lit ? "#F5C451" : "none"}
                    stroke="#F5C451"
                    strokeWidth={lit ? 0 : 2}
                    opacity={lit ? 1 : 0.9}
                  />
                )}
              </g>
              {!isYou && (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor={label.anchor}
                  fill="#A9B1CC"
                  fontSize={12}
                >
                  {labelText}
                </text>
              )}
            </g>
          );
        })}

        {nextMove && youPoint && (
          <foreignObject
            x={calloutX}
            y={calloutY}
            width={168}
            height={80}
            className="overflow-visible"
          >
            <NextMoveCallout move={nextMove} onSpeak={onSpeakNextMove} />
          </foreignObject>
        )}
      </svg>
    </div>
  );
}

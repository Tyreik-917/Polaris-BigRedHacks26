"use client";

import type { Goal, Projection, Waypoint } from "@/lib/types";
import {
  curveToPath,
  enrichWaypointsForMap,
  layoutWaypoints,
  MAP,
  normalOnCurve,
  rerouteCurve,
  routeCurve,
  splitCurve,
  STAR_FIELD_DOTS,
  type MapPoint,
  type RouteCurve,
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
  /** The waypoint whose detail sheet is open; drawn with a ring. */
  selectedWaypoint?: Waypoint | null;
  /** Kept for callers; the storyboard map shows a tap hint instead. */
  nextMove?: Projection["nextMove"];
  onSpeakNextMove?: () => void;
};

const GOLD = "#F5C451";
const OLD_ROUTE = "#5A6694";
const INK = "#E8ECF7";
const MUTED = "#A9B1CC";

function starPath(cx: number, cy: number, outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function waypointKey(w: Waypoint) {
  return `${w.date}|${w.label}`;
}

const ROUTE = routeCurve(1);
const REROUTE = rerouteCurve();

const LABEL_OFFSET = 16;
const LABEL_CHAR_WIDTH = 6.8;

/**
 * Label beside the star, on the left of travel when it fits, otherwise on the
 * right, so labels never get pushed back across the route at the canvas edge.
 */
function labelPlacement(curve: RouteCurve, pt: MapPoint, text: string) {
  const width = text.length * LABEL_CHAR_WIDTH;
  const n = normalOnCurve(curve, pt.t);
  const place = (sign: 1 | -1) => {
    const nx = n.x * sign;
    const ny = n.y * sign;
    const anchor: "start" | "middle" | "end" =
      Math.abs(nx) < 0.35 ? "middle" : nx > 0 ? "start" : "end";
    const x = pt.x + nx * LABEL_OFFSET;
    const left =
      anchor === "end" ? x - width : anchor === "middle" ? x - width / 2 : x;
    const overflow = Math.max(0, 6 - left, left + width - (MAP.width - 6));
    return { x, y: pt.y + ny * LABEL_OFFSET + 4, anchor, left, overflow };
  };
  const preferred = place(1);
  const other = place(-1);
  const best = preferred.overflow <= other.overflow ? preferred : other;
  let x = best.x;
  if (best.left < 6) x += 6 - best.left;
  if (best.left + width > MAP.width - 6) x -= best.left + width - (MAP.width - 6);
  return { x, y: best.y, anchor: best.anchor };
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
  selectedWaypoint,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [introDone, setIntroDone] = useState(false);
  const [postcardFailed, setPostcardFailed] = useState(false);
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

  // After a reroute the stars sit on the new path; the old one stays as a gray ghost.
  const rerouted = Boolean(previousWaypoints?.length) && reroutePhase !== "none";
  const curve = rerouted ? REROUTE : ROUTE;

  const points = useMemo(
    () => layoutWaypoints(routeWaypoints, startDate, endDate, curve),
    [routeWaypoints, startDate, endDate, curve],
  );

  const youIndex = points.findIndex((p) => p.waypoint.label === "You");
  const youPoint = points[Math.max(0, youIndex)];
  const youT = youPoint?.t ?? 0;

  const [passedCurve, aheadCurve] = splitCurve(curve, youT);
  const passedPath = youT > 0 ? curveToPath(passedCurve) : null;
  const aheadPath = curveToPath(aheadCurve);
  const oldAheadPath = rerouted ? curveToPath(splitCurve(ROUTE, youT)[1]) : null;

  const drawing = reroutePhase === "draw" && !reduceMotion;
  const selectedKey = selectedWaypoint ? waypointKey(selectedWaypoint) : null;

  const mapSummary = `Route to ${goal.name}, ${points.filter((p) => p.waypoint.status === "passed").length} of ${points.length} checkpoints passed, ETA ${projection.eta ? formatMonDay(projection.eta) : "unknown"}`;

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
            r={d.r}
            fill={INK}
            opacity={0.45}
          />
        ))}

        {rerouted ? (
          <g transform="translate(14, 12)">
            <rect
              width={128}
              height={46}
              rx={10}
              fill="#121937"
              stroke="#232B4D"
            />
            <line
              x1={10}
              y1={16}
              x2={30}
              y2={16}
              stroke={OLD_ROUTE}
              strokeWidth={2}
              strokeDasharray="2 4"
              strokeLinecap="round"
            />
            <text x={38} y={20} fill={MUTED} fontSize={12}>
              Previous route
            </text>
            <line
              x1={10}
              y1={32}
              x2={30}
              y2={32}
              stroke={GOLD}
              strokeWidth={2.5}
              strokeDasharray="2 4"
              strokeLinecap="round"
            />
            <text x={38} y={36} fill={INK} fontSize={12}>
              New route
            </text>
          </g>
        ) : (
          <text
            x={16}
            y={26}
            fill={GOLD}
            fontSize={12}
            fontWeight={700}
            letterSpacing="1.2"
            style={{ textTransform: "uppercase" }}
          >
            Follow the stars
          </text>
        )}

        <g style={{ pointerEvents: "none" }}>
          {oldAheadPath && (
            <motion.path
              d={oldAheadPath}
              fill="none"
              stroke={OLD_ROUTE}
              strokeWidth={2}
              strokeDasharray="2 7"
              strokeLinecap="round"
              initial={{ opacity: reduceMotion ? 0.75 : 1 }}
              animate={{ opacity: 0.75 }}
              transition={{ duration: reduceMotion ? 0 : 0.3 }}
            />
          )}

          {passedPath && (
            <motion.path
              d={passedPath}
              fill="none"
              stroke={GOLD}
              strokeWidth={3}
              strokeLinecap="round"
              initial={
                reduceMotion ? { pathLength: 1 } : { pathLength: 0, opacity: 0.6 }
              }
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: reduceMotion ? 0 : 1.2, ease: "easeInOut" }}
              onAnimationComplete={() => setIntroDone(true)}
            />
          )}

          {/* Dotted on purpose; animating pathLength would replace the dots with a solid dash. */}
          <motion.path
            key={rerouted ? "new-route" : "route"}
            d={aheadPath}
            fill="none"
            stroke={GOLD}
            strokeWidth={2.5}
            strokeDasharray="2 8"
            strokeLinecap="round"
            initial={{ opacity: drawing || !reduceMotion ? 0 : 1 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: reduceMotion ? 0 : drawing ? 1.2 : 0.8,
              delay: drawing ? 0.3 : 0.2,
            }}
          />
        </g>

        {points.map((pt, i) => {
          const w = pt.waypoint;
          const isStart = w.label === "Start";
          const isGoal = w.label === goal.name && w.date === goal.targetDate;
          const isYou = w.label === "You";
          const isNewIncome =
            w.reported === true || (w.kind === "income" && w.date === todayIso);

          if (isStart) {
            return (
              <g key={`${w.date}-${w.label}`}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={6}
                  fill="none"
                  stroke={INK}
                  strokeWidth={2}
                />
                <text x={pt.x + 10} y={pt.y + 4} fill={MUTED} fontSize={12}>
                  Start
                </text>
              </g>
            );
          }

          if (isGoal) {
            const showImage = Boolean(
              postcardUrl && !postcardPending && !postcardFailed,
            );
            return (
              <g key={`${w.date}-${w.label}`}>
                <circle cx={pt.x} cy={pt.y} r={26} fill={GOLD} opacity={0.12} />
                <polygon points={starPath(pt.x, pt.y, 22, 9)} fill={GOLD} />
                <foreignObject
                  x={pt.x - 58}
                  y={pt.y + 30}
                  width={116}
                  height={84}
                >
                  <div className="flex flex-col items-center">
                    {showImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={postcardUrl}
                        alt={`Grok Imagine postcard for ${goal.name}`}
                        className="h-[62px] w-[94px] rounded-lg object-cover"
                        onError={() => setPostcardFailed(true)}
                      />
                    ) : (
                      <div className="flex h-[62px] w-[94px] items-center justify-center rounded-lg border border-dashed border-old-route bg-panel/80 px-1 text-center text-[10px] leading-tight text-muted">
                        Grok Imagine
                      </div>
                    )}
                    <p className="mt-1 text-[12px] font-bold tabular-nums text-ink">
                      {formatUsd(goal.targetAmount)} ·{" "}
                      {formatMonDay(goal.targetDate)}
                    </p>
                  </div>
                </foreignObject>
              </g>
            );
          }

          const labelText = w.expected
            ? `${w.label} · +${formatUsd(w.amount)} · ${formatMonDay(w.date)}`
            : isNewIncome
            ? `${w.label} · +${formatUsd(w.amount)}`
            : w.status === "passed" && w.kind === "bill"
              ? `${w.label} · paid`
              : `${w.label} · ${formatMonDay(w.date)}`;
          const label = labelPlacement(curve, pt, labelText);
          const lit =
            isNewIncome ||
            w.status === "passed" ||
            (isYou && (introDone || reduceMotion));
          const selected = selectedKey === waypointKey(w);

          return (
            <g key={`${w.date}-${w.label}-${i}`}>
              {/* <button> isn't an SVG element; an accessible <g> stands in. */}
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
                {/* Generous invisible hit area so the hollow middle of a star is tappable. */}
                <circle cx={pt.x} cy={pt.y} r={20} fill="transparent" />
                {selected && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={18}
                    fill={GOLD}
                    fillOpacity={0.18}
                    stroke={GOLD}
                    strokeWidth={2}
                  />
                )}
                {isYou ? (
                  <>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={14}
                      fill={rerouted ? GOLD : INK}
                      opacity={rerouted ? 0.22 : 0.15}
                      className={reduceMotion ? undefined : "animate-pulse"}
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={7}
                      fill={INK}
                      stroke="#0D1430"
                      strokeWidth={2}
                    />
                  </>
                ) : (
                  <polygon
                    points={starPath(pt.x, pt.y, 10, 4.5)}
                    fill={lit || selected ? GOLD : "none"}
                    stroke={GOLD}
                    strokeWidth={lit || selected ? 0 : 1.5}
                  />
                )}
              </g>
              {isYou ? (
                <text
                  x={Math.max(16, pt.x - 24)}
                  y={pt.y + 30}
                  fill={MUTED}
                  fontSize={12}
                  style={{ pointerEvents: "none" }}
                >
                  You · {formatMonDay(w.date)}
                </text>
              ) : (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor={label.anchor}
                  fill={isNewIncome || w.expected ? GOLD : INK}
                  fontWeight={isNewIncome || w.expected ? 700 : 400}
                  fontSize={12}
                  style={{ pointerEvents: "none" }}
                >
                  {labelText}
                </text>
              )}
            </g>
          );
        })}

        {!rerouted && (
          <foreignObject
            x={MAP.width - 170}
            y={MAP.height - 48}
            width={156}
            height={36}
          >
            <div className="flex h-[34px] items-center justify-center gap-1.5 rounded-full border border-[#3a4675] bg-[#1a2346] text-[12px] text-ink">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={GOLD}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M9 11V5a2 2 0 0 1 4 0v6" />
                <path d="M13 9a2 2 0 0 1 4 0v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-3a2 2 0 0 1 3-2l2 2" />
              </svg>
              Tap a star for details
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  );
}

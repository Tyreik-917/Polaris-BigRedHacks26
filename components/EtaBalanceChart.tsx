"use client";

import type { DailyPoint } from "@/lib/projection/engine";
import { sampleDailySeries } from "@/lib/projection/eta-copy";
import { useMemo } from "react";

type Props = {
  series: DailyPoint[];
  targetAmount: number;
  targetDate: string;
  etaDate: string | null;
  previousSeries?: DailyPoint[];
  showComparison?: boolean;
};

const W = 320;
const H = 88;
const PAD = 4;

function buildPath(
  points: DailyPoint[],
  targetAmount: number,
): { path: string; goalY: number; minY: number; maxY: number; toX: (i: number) => number; toY: (v: number) => number } | null {
  if (points.length < 2) return null;

  const balances = points.map((p) => p.balance);
  const minY = Math.min(0, ...balances);
  const maxY = Math.max(targetAmount, ...balances);
  const span = maxY - minY || 1;

  const toX = (i: number) =>
    PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const toY = (v: number) =>
    PAD + (1 - (v - minY) / span) * (H - PAD * 2);

  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.balance).toFixed(1)}`,
    )
    .join(" ");

  return { path, goalY: toY(targetAmount), minY, maxY, toX, toY };
}

export function EtaBalanceChart({
  series,
  targetAmount,
  targetDate,
  etaDate,
  previousSeries,
  showComparison,
}: Props) {
  const points = useMemo(() => sampleDailySeries(series, 72), [series]);
  const prevPoints = useMemo(
    () => (previousSeries ? sampleDailySeries(previousSeries, 72) : []),
    [previousSeries],
  );

  const { path, goalY, etaX, previousPath } = useMemo(() => {
    const built = buildPath(points, targetAmount);
    if (!built) {
      return {
        path: "",
        goalY: H / 2,
        etaX: null as number | null,
        previousPath: "",
      };
    }

    const { path, goalY, toX } = built;

    let etaX: number | null = null;
    if (etaDate) {
      const idx = points.findIndex((p) => p.date >= etaDate);
      if (idx >= 0) etaX = toX(idx);
    }

    let previousPath = "";
    if (showComparison && prevPoints.length >= 2) {
      const prevBuilt = buildPath(prevPoints, targetAmount);
      if (prevBuilt) previousPath = prevBuilt.path;
    }

    return { path, goalY, etaX, previousPath };
  }, [points, prevPoints, targetAmount, etaDate, showComparison]);

  if (points.length < 2) return null;

  const targetIdx = points.findIndex((p) => p.date >= targetDate.slice(0, 10));
  const targetX =
    targetIdx >= 0
      ? PAD + (targetIdx / (points.length - 1)) * (W - PAD * 2)
      : W - PAD;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-500">
        <span>Projected savings</span>
        <span>Goal ${targetAmount}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-24 w-full text-sky-400"
        role="img"
        aria-label="Day-by-day projected savings balance toward your goal"
      >
        <line
          x1={PAD}
          y1={goalY}
          x2={W - PAD}
          y2={goalY}
          className="stroke-slate-600"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        {targetX <= W - PAD && (
          <line
            x1={targetX}
            y1={PAD}
            x2={targetX}
            y2={H - PAD}
            className="stroke-amber-500/40"
            strokeWidth={1}
          />
        )}
        {etaX != null && (
          <line
            x1={etaX}
            y1={PAD}
            x2={etaX}
            y2={H - PAD}
            className="stroke-sky-500/35"
            strokeWidth={1}
          />
        )}
        {previousPath && (
          <path
            d={previousPath}
            fill="none"
            className="stroke-slate-500"
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.85}
          />
        )}
        <path
          d={path}
          fill="none"
          className={showComparison ? "stroke-amber-400" : "stroke-sky-400"}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
        {showComparison && (
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 bg-slate-500" />
            Previous route
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <span
            className={`inline-block h-0.5 w-3 ${showComparison ? "bg-amber-400" : "bg-sky-400"}`}
          />
          {showComparison ? "New route" : "Balance"}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 border-t border-dashed border-slate-500" />
          Goal
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-0.5 bg-amber-500/50" />
          Target date
        </span>
        {etaDate && (
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-0.5 bg-sky-500/40" />
            Projected arrival
          </span>
        )}
      </div>
    </div>
  );
}

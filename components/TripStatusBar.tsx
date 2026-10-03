"use client";

import { Progress } from "@/components/ui/progress";
import { ReroutingBadge } from "@/components/ReroutingBadge";
import {
  buildTripStatusSummary,
  formatRerouteEtaChange,
} from "@/lib/projection/eta-copy";
import type { ProjectionResult } from "@/lib/projection/engine";
import { cn } from "@/lib/utils";

type Props = {
  projection: ProjectionResult | null;
  previousProjection?: ProjectionResult | null;
  goalLabel?: string;
  loading?: boolean;
  rerouting?: boolean;
};

export function TripStatusBar({
  projection,
  previousProjection,
  goalLabel,
  loading,
  rerouting,
}: Props) {
  if (loading && !projection) {
    return (
      <div
        className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3"
        aria-busy="true"
        aria-label="Calculating trip status"
      >
        <p className="text-sm text-slate-400">Plotting route…</p>
        <Progress value={0} className="mt-3 h-1.5 [&_[data-slot=progress-track]]:bg-slate-800" />
      </div>
    );
  }

  if (!projection) return null;

  const summary = buildTripStatusSummary(projection);
  const etaChange =
    !rerouting && previousProjection
      ? formatRerouteEtaChange(
          previousProjection.etaDate,
          projection.etaDate,
        )
      : null;
  const etaSegment = summary.etaDateLabel
    ? `ETA ${summary.etaDateLabel}`
    : "ETA unclear";

  const paceClass =
    summary.onTrack === true
      ? "text-emerald-300/95"
      : summary.onTrack === false
        ? "text-amber-200/95"
        : "text-slate-400";

  return (
    <section
      className="rounded-xl border border-sky-900/50 bg-slate-950/80 px-4 py-3 ring-1 ring-sky-950/40"
      aria-label="Trip status"
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        {goalLabel && (
          <p className="truncate text-xs font-medium uppercase tracking-wide text-sky-400/80">
            {goalLabel}
          </p>
        )}
        {rerouting && <ReroutingBadge />}
      </div>
      {etaChange && (
        <p className="mb-1 text-xs font-medium tabular-nums text-amber-200/95">
          {etaChange}
        </p>
      )}
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-slate-200">
        <span className="font-medium tabular-nums">{etaSegment}</span>
        <span className="text-slate-600" aria-hidden>
          ·
        </span>
        <span className={cn("font-medium", paceClass)}>{summary.paceLabel}</span>
        <span className="text-slate-600" aria-hidden>
          ·
        </span>
        <span className="tabular-nums text-slate-300">
          ${summary.savedCurrent} / ${summary.savedTarget}
        </span>
      </p>
      <Progress
        value={summary.progressPercent}
        className="mt-3 h-1.5 [&_[data-slot=progress-indicator]]:bg-sky-500 [&_[data-slot=progress-track]]:bg-slate-800"
        aria-valuenow={summary.progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${summary.progressPercent}% toward goal`}
      />
      <p className="sr-only">
        {etaSegment}, {summary.paceLabel}, {summary.progressPercent} percent of
        savings goal reached.
      </p>
    </section>
  );
}

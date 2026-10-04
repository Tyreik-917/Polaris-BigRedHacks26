"use client";

import type { Goal, Projection } from "@/lib/types";
import { formatMonDay, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  goal: Goal;
  projection: Projection;
  rerouting?: boolean;
  rerouteFaster?: boolean;
  previousEta?: string | null;
  /** Saved amount before the money that triggered a faster reroute. */
  previousSaved?: number | null;
};

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T12:00:00`).getTime();
  const to = new Date(`${toIso}T12:00:00`).getTime();
  return Math.round((to - from) / 86400000);
}

function Stat({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[12px] text-muted">{label}</span>
      <span
        className={cn(
          "whitespace-nowrap text-[16px] font-bold tabular-nums text-ink",
          className,
        )}
      >
        {children}
      </span>
    </div>
  );
}

export function TripStatusBarSpec({
  goal,
  projection,
  rerouting,
  rerouteFaster,
  previousEta,
  previousSaved,
}: Props) {
  const pct = (amount: number) =>
    goal.targetAmount > 0
      ? Math.max(0, Math.min(100, (amount / goal.targetAmount) * 100))
      : 0;
  const progress = pct(projection.saved);
  const savedLabel = `${formatUsd(projection.saved)} / ${formatUsd(goal.targetAmount)}`;

  const header = (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-heading truncate text-[18px] font-bold text-ink">
        {goal.name}
      </span>
      <span className="shrink-0 text-[13px] text-muted">
        Arrive by {formatMonDay(goal.targetDate)}
      </span>
    </div>
  );

  if (rerouting) {
    const delta =
      previousEta && projection.eta
        ? daysBetween(previousEta, projection.eta)
        : 0;
    const changeLabel =
      delta < 0 ? `${-delta} days sooner` : delta > 0 ? `+${delta} days` : "—";
    const priorPct =
      rerouteFaster && previousSaved != null ? pct(previousSaved) : progress;

    return (
      <section
        className="flex shrink-0 flex-col gap-2.5 border-b border-line px-4 py-3"
        aria-label="Trip status while rerouting"
      >
        {header}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)] gap-2">
          <Stat label="New ETA">
            {previousEta && (
              <span className="mr-1 font-medium text-[#6d7799] line-through">
                {formatMonDay(previousEta)}
              </span>
            )}
            {projection.eta ? formatMonDay(projection.eta) : "—"}
          </Stat>
          <Stat
            label="Change"
            className={delta < 0 ? "text-star" : "text-offcourse"}
          >
            {changeLabel}
          </Stat>
          {rerouteFaster ? (
            <Stat label="Saved">{savedLabel}</Stat>
          ) : (
            <Stat label="With moves" className="text-star">
              {projection.etaWithMoves
                ? formatMonDay(projection.etaWithMoves)
                : "—"}
            </Stat>
          )}
        </div>
        {rerouteFaster && (
          <div
            className="flex h-1.5 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full bg-star" style={{ width: `${priorPct}%` }} />
            <div
              className="h-full bg-[#ffe29a] transition-all duration-700"
              style={{ width: `${Math.max(0, progress - priorPct)}%` }}
            />
          </div>
        )}
      </section>
    );
  }

  const statusLabel = !projection.eta
    ? "Off course"
    : projection.onTrack
      ? projection.daysLate < 0
        ? `${Math.abs(projection.daysLate)} days early`
        : "On track"
      : `${projection.daysLate} days late`;

  return (
    <section
      className="flex shrink-0 flex-col gap-2.5 border-b border-line px-4 py-3"
      aria-label="Trip status"
    >
      {header}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)] gap-2">
        <Stat label="ETA">
          {projection.eta ? formatMonDay(projection.eta) : "Not at this pace"}
        </Stat>
        <Stat
          label="Status"
          className={projection.onTrack ? "text-star" : "text-offcourse"}
        >
          {statusLabel}
        </Stat>
        <Stat label="Saved">{savedLabel}</Stat>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-star transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  );
}

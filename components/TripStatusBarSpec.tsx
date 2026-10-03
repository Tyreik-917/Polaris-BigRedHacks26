"use client";

import type { Goal, Projection } from "@/lib/types";
import { formatMonDay, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  goal: Goal;
  projection: Projection;
  rerouting?: boolean;
  previousEta?: string | null;
};

export function TripStatusBarSpec({
  goal,
  projection,
  rerouting,
  previousEta,
}: Props) {
  const progress =
    projection.saved && goal.targetAmount
      ? Math.min(100, (projection.saved / goal.targetAmount) * 100)
      : 0;

  const statusLabel = projection.onTrack
    ? "On track"
    : projection.daysLate > 0
      ? `${projection.daysLate} days late`
      : projection.daysLate < 0
        ? `${Math.abs(projection.daysLate)} days early`
        : "On track";

  const statusClass = projection.onTrack ? "text-star" : "text-offcourse";

  const etaLabel = projection.eta
    ? formatMonDay(projection.eta)
    : "Not at this pace";

  if (rerouting) {
    return (
      <section
        className="shrink-0 border-b border-line px-4 py-3"
        aria-label="Trip status while rerouting"
      >
        <p className="truncate text-[13px] font-medium text-ink">{goal.name}</p>
        <p className="text-[12px] text-muted">
          Arrive by {formatMonDay(goal.targetDate)}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[12px]">
          <div>
            <p className="text-muted">New ETA</p>
            <p className="mt-1 text-[13px] font-medium text-ink">
              {previousEta && (
                <span className="mr-1 text-muted line-through">
                  {formatMonDay(previousEta)}
                </span>
              )}
              {projection.eta ? formatMonDay(projection.eta) : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted">Change</p>
            <p className="mt-1 text-[13px] font-medium text-offcourse">
              {previousEta && projection.eta
                ? `+${Math.max(
                    0,
                    Math.round(
                      (new Date(`${projection.eta}T12:00:00`).getTime() -
                        new Date(`${previousEta}T12:00:00`).getTime()) /
                        86400000,
                    ),
                  )} days`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted">With moves</p>
            <p className="mt-1 text-[13px] font-medium text-star">
              {projection.etaWithMoves
                ? formatMonDay(projection.etaWithMoves)
                : "—"}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="shrink-0 border-b border-line px-4 py-3"
      aria-label="Trip status"
    >
      <p className="truncate text-[13px] font-medium text-ink">{goal.name}</p>
      <p className="text-[12px] text-muted">
        Arrive by {formatMonDay(goal.targetDate)}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[12px]">
        <div>
          <p className="text-muted">ETA</p>
          <p className="mt-1 text-[13px] font-medium text-ink">{etaLabel}</p>
        </div>
        <div>
          <p className="text-muted">Status</p>
          <p className={cn("mt-1 text-[13px] font-medium", statusClass)}>
            {statusLabel}
          </p>
        </div>
        <div>
          <p className="text-muted">Saved</p>
          <p className="mt-1 text-[13px] font-medium tabular-nums text-ink">
            {formatUsd(projection.saved)} / {formatUsd(goal.targetAmount)}
          </p>
        </div>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={progress}
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

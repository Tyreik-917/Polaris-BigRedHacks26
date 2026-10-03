"use client";

import type { Goal, Overview, Projection } from "@/lib/types";
import { formatMonDay, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  goal: Goal;
  overview: Overview;
  projection: Projection;
  loading?: boolean;
};

export function AccountSummaryCard({
  goal,
  overview,
  projection,
  loading,
}: Props) {
  if (loading) {
    return (
      <div
        className="animate-pulse rounded-2xl border border-border bg-card p-4"
        aria-busy="true"
      >
        <div className="h-4 w-40 rounded bg-line" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-line" />
          ))}
        </div>
        <div className="mt-4 h-10 rounded-lg bg-line" />
      </div>
    );
  }

  const stripOnTrack = projection.onTrack;
  const stripText = stripOnTrack
    ? `On track, arriving ${projection.eta ? formatMonDay(projection.eta) : formatMonDay(goal.targetDate)}.`
    : projection.eta
      ? `ETA ${formatMonDay(projection.eta)}, ${projection.daysLate} days late at your current pace.`
      : "Not at this pace for your goal date.";

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="font-heading text-[17px] font-bold text-ink">
          {goal.name}
        </h2>
        <p className="text-[13px] tabular-nums text-muted">
          {formatUsd(goal.targetAmount)} by {formatMonDay(goal.targetDate)}
        </p>
      </header>
      <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
        <div className="rounded-xl bg-panel px-3 py-2">
          <p className="text-muted">Checking</p>
          <p className="mt-1 font-medium tabular-nums text-ink">
            {formatUsd(overview.checking)}
          </p>
        </div>
        <div className="rounded-xl bg-panel px-3 py-2">
          <p className="text-muted">Savings</p>
          <p className="mt-1 font-medium tabular-nums text-ink">
            {formatUsd(overview.savings)}
          </p>
        </div>
        <div className="rounded-xl bg-panel px-3 py-2">
          <p className="text-muted">Bills before target</p>
          <p className="mt-1 font-medium tabular-nums text-ink">
            {formatUsd(overview.billsBeforeTarget)}
          </p>
        </div>
        <div className="rounded-xl bg-panel px-3 py-2">
          <p className="text-muted">Food spending</p>
          <p className="mt-1 font-medium tabular-nums text-ink">
            {formatUsd(overview.foodSpending)}
          </p>
        </div>
      </div>
      <p
        className={cn(
          "mt-4 rounded-xl px-3 py-2 text-[13px] leading-snug",
          stripOnTrack
            ? "bg-star/15 text-star"
            : "bg-offcourse-bg text-offcourse",
        )}
      >
        {stripText}
      </p>
    </article>
  );
}

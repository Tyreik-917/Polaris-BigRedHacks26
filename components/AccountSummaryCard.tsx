"use client";

import type { Goal, Overview, Projection } from "@/lib/types";
import { formatMonDay, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

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

  const stats: { label: string; value: string }[] = [
    { label: "Checking", value: formatCents(overview.checking) },
    { label: "Savings", value: formatCents(overview.savings) },
    {
      label: `Bills before ${formatMonDay(goal.targetDate)}`,
      value: formatUsd(overview.billsBeforeTarget),
    },
    { label: "Food spending", value: `${formatUsd(overview.foodSpending)} / wk` },
  ];
  if (overview.paycheckIntervalLabel) {
    stats.push({ label: "Paydays", value: overview.paycheckIntervalLabel });
  }
  if (overview.paycheckAmount != null && overview.paycheckAmount > 0) {
    stats.push({
      label: "Each paycheck",
      value: formatUsd(overview.paycheckAmount),
    });
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-baseline justify-between gap-2 border-b border-line px-4 py-3.5">
        <h2 className="font-heading text-[17px] font-bold text-ink">
          {goal.name}
        </h2>
        <p className="text-[14px] text-muted">
          by {formatMonDay(goal.targetDate)}
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 text-[13px]">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5">
            <dt className="text-muted">{s.label}</dt>
            <dd className="text-[16px] font-bold tabular-nums text-ink">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      <div
        className={cn(
          "flex items-center gap-2.5 px-4 py-3 text-[14px] leading-snug text-ink",
          stripOnTrack ? "bg-star/15" : "bg-offcourse-bg",
        )}
      >
        <Clock
          className={cn(
            "h-[18px] w-[18px] shrink-0",
            stripOnTrack ? "text-star" : "text-[#f08a4b]",
          )}
          aria-hidden
        />
        {stripOnTrack ? (
          <p>
            On track, arriving{" "}
            <strong>
              {formatMonDay(projection.eta ?? goal.targetDate)}
            </strong>
          </p>
        ) : projection.eta ? (
          <p>
            ETA <strong>{formatMonDay(projection.eta)}</strong>,{" "}
            <span className="font-bold text-offcourse">
              {projection.daysLate} days late
            </span>{" "}
            at your current pace
          </p>
        ) : (
          <p>Not at this pace for your goal date.</p>
        )}
      </div>
    </article>
  );
}

function formatCents(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

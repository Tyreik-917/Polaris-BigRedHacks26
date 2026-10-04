"use client";

import type { Goal, Waypoint, WaypointCheckpoint } from "@/lib/types";
import { formatMonDay, formatUsd } from "@/lib/format";
import { useFixtures } from "@/lib/api";
import { fixtureCheckpointDetail } from "@/lib/fixtures";
import { polarisFetch } from "@/lib/api/client-fetch";
import { readApiError } from "@/lib/api/read-error";
import { useEffect, useState } from "react";

type Props = {
  waypoint: Waypoint;
  goal: Goal;
  onClose: () => void;
};

function formatSigned(amount: number, incoming: boolean) {
  const prefix = incoming ? "+" : "−";
  return `${prefix}${formatUsd(Math.abs(amount))}`;
}

async function fetchCheckpoint(
  goalId: string,
  waypoint: Waypoint,
): Promise<WaypointCheckpoint> {
  const res = await polarisFetch(`/api/goals/${goalId}/checkpoints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: waypoint.date, label: waypoint.label }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return (await res.json()) as WaypointCheckpoint;
}

export function WaypointCheckpointSheet({ waypoint, goal, onClose }: Props) {
  const fixtures = useFixtures;
  const [detail, setDetail] = useState<WaypointCheckpoint>(() =>
    fixtureCheckpointDetail(waypoint, goal),
  );

  useEffect(() => {
    if (fixtures) {
      setDetail(fixtureCheckpointDetail(waypoint, goal));
      return;
    }
    void fetchCheckpoint(goal.id, waypoint)
      .then(setDetail)
      .catch(() => setDetail(fixtureCheckpointDetail(waypoint, goal)));
  }, [fixtures, goal, waypoint]);

  const dateLabel = new Date(`${waypoint.date}T12:00:00`).toLocaleDateString(
    "en-US",
    { weekday: "short", month: "short", day: "numeric" },
  );

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-border bg-card shadow-2xl md:left-auto md:right-6 md:max-w-md md:rounded-2xl"
      role="dialog"
      aria-labelledby="checkpoint-title"
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-line bg-card px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Checkpoint {detail.checkpointIndex} of {detail.checkpointTotal} ·{" "}
          {dateLabel.toUpperCase()}
        </p>
        <button
          type="button"
          className="text-sm text-muted"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div>
          <h2
            id="checkpoint-title"
            className="font-heading text-[22px] font-bold text-ink"
          >
            {waypoint.label}
          </h2>
          {detail.inspireLine && (
            <p className="mt-1 text-[15px] text-muted">{detail.inspireLine}</p>
          )}
        </div>

        {detail.imagineUrl && (
          <div className="overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={detail.imagineUrl}
              alt="Visual inspiration for your savings goal"
              className="h-40 w-full object-cover"
            />
            <p className="bg-panel px-3 py-1.5 text-[11px] text-muted">
              Grok Imagine · your goal
            </p>
          </div>
        )}

        {detail.comingIn && detail.comingIn.length > 0 && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Coming in
            </h3>
            <ul className="mt-2 space-y-2">
              {detail.comingIn.map((row) => (
                <li
                  key={row.label}
                  className="flex justify-between text-[15px] text-ink"
                >
                  <span>{row.label}</span>
                  <span className="tabular-nums text-star">
                    {formatSigned(row.amount, true)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {detail.dueBeforeNext && detail.dueBeforeNext.length > 0 && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Due before the next star
            </h3>
            <ul className="mt-2 space-y-2">
              {detail.dueBeforeNext.map((row) => (
                <li
                  key={row.label}
                  className="flex justify-between text-[15px] text-ink"
                >
                  <span>{row.label}</span>
                  <span className="tabular-nums text-offcourse">
                    {formatSigned(row.amount, false)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {detail.savedTowardGoal != null && (
          <p className="rounded-xl bg-star/10 px-3 py-2 text-[14px] text-star">
            Saved by this star · {formatUsd(detail.savedTowardGoal)} of{" "}
            {formatUsd(goal.targetAmount)}
          </p>
        )}

        <p className="text-[12px] text-muted">
          {waypoint.kind === "bill"
            ? `${waypoint.label} · ${formatMonDay(waypoint.date)} · auto-pays from checking`
            : `${waypoint.label} · ${formatMonDay(waypoint.date)}`}
        </p>
      </div>
    </div>
  );
}

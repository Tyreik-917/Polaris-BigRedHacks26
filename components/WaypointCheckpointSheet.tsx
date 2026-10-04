"use client";

import type { Goal, Waypoint, WaypointCheckpoint } from "@/lib/types";
import { formatMonDay, formatUsd } from "@/lib/format";
import { useFixtures } from "@/lib/api";
import { fixtureCheckpointDetail } from "@/lib/fixtures";
import { polarisFetch } from "@/lib/api/client-fetch";
import { readApiError } from "@/lib/api/read-error";
import { Star, Volume2, X } from "lucide-react";
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

  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.speechSynthesis?.cancel();
    };
  }, [onClose]);

  const dateLabel = new Date(`${waypoint.date}T12:00:00`).toLocaleDateString(
    "en-US",
    { weekday: "short", month: "short", day: "numeric" },
  );

  const speak = () => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth) return;
    const parts = [`${waypoint.label}, ${formatMonDay(waypoint.date)}.`];
    if (detail.inspireLine) parts.push(detail.inspireLine);
    for (const row of detail.comingIn ?? []) {
      parts.push(`Coming in: ${row.label}, ${formatUsd(Math.abs(row.amount))}.`);
    }
    for (const row of detail.dueBeforeNext ?? []) {
      parts.push(`Due: ${row.label}, ${formatUsd(Math.abs(row.amount))}.`);
    }
    if (detail.savedTowardGoal != null) {
      parts.push(
        `You'll have ${formatUsd(detail.savedTowardGoal)} of ${formatUsd(goal.targetAmount)} saved by this star.`,
      );
    }
    synth.cancel();
    synth.speak(new SpeechSynthesisUtterance(parts.join(" ")));
  };

  const savedPct =
    detail.savedTowardGoal != null && goal.targetAmount > 0
      ? Math.max(0, Math.min(100, (detail.savedTowardGoal / goal.targetAmount) * 100))
      : 0;
  const showImage = Boolean(detail.imagineUrl) && !imageFailed;

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-[rgba(5,8,18,0.55)]"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-40 max-h-[62vh] overflow-y-auto rounded-t-3xl border-t border-[#3a4675] bg-[#10173a] shadow-2xl md:left-auto md:right-6 md:max-w-md md:rounded-2xl md:border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkpoint-title"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-[#3a4675]" />
        <div className="space-y-3.5 px-5 pb-5 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-star">
                Checkpoint {detail.checkpointIndex} of {detail.checkpointTotal} ·{" "}
                {dateLabel}
              </p>
              <h2
                id="checkpoint-title"
                className="font-heading mt-1 text-[22px] font-bold text-ink"
              >
                {waypoint.label}
              </h2>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                aria-label="Hear this from Polaris"
                onClick={speak}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3a4675] bg-[#1a2346] text-star"
              >
                <Volume2 className="h-[18px] w-[18px]" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3a4675] bg-[#1a2346] text-ink"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          {showImage ? (
            <figure className="relative overflow-hidden rounded-2xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={detail.imagineUrl}
                alt={`Grok Imagine image for ${goal.name}`}
                className="h-32 w-full object-cover"
                onError={() => setImageFailed(true)}
              />
              {detail.inspireLine && (
                <figcaption className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-[rgba(11,16,32,0.85)] px-3 py-2 text-[13px] font-medium text-ink">
                  <Star className="h-3.5 w-3.5 shrink-0 fill-star text-star" aria-hidden />
                  {detail.inspireLine}
                </figcaption>
              )}
            </figure>
          ) : (
            detail.inspireLine && (
              <p className="flex items-center gap-2 rounded-2xl border border-dashed border-old-route bg-panel px-3 py-3 text-[13px] font-medium text-ink">
                <Star className="h-3.5 w-3.5 shrink-0 fill-star text-star" aria-hidden />
                {detail.inspireLine}
              </p>
            )
          )}

          {detail.comingIn && detail.comingIn.length > 0 && (
            <section>
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
                Coming in
              </h3>
              <ul className="mt-1.5 space-y-1.5">
                {detail.comingIn.map((row) => (
                  <li
                    key={row.label}
                    className="flex justify-between text-[15px] text-ink"
                  >
                    <span>{row.label}</span>
                    <span className="font-bold tabular-nums text-star">
                      {formatSigned(row.amount, true)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {detail.dueBeforeNext && detail.dueBeforeNext.length > 0 && (
            <section>
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
                Due before the next star
              </h3>
              <ul className="mt-1.5 space-y-1.5">
                {detail.dueBeforeNext.map((row) => (
                  <li
                    key={row.label}
                    className="flex justify-between text-[15px] text-ink"
                  >
                    <span>{row.label}</span>
                    <span className="font-bold tabular-nums">
                      {formatSigned(row.amount, false)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {detail.savedTowardGoal != null && (
            <div className="space-y-2 rounded-xl border border-[#232b4d] bg-card px-3.5 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-muted">Saved by this star</span>
                <span className="text-[15px] font-bold tabular-nums text-ink">
                  {formatUsd(detail.savedTowardGoal)} of{" "}
                  {formatUsd(goal.targetAmount)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-star"
                  style={{ width: `${savedPct}%` }}
                />
              </div>
            </div>
          )}

          {waypoint.kind === "bill" && (
            <p className="text-[12px] text-muted">
              Auto-pays from your Capital One checking.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

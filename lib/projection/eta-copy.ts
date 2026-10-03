import type { ProjectionResult } from "./engine";
import type { DailyPoint } from "./engine";

/** User-facing date, e.g. "Jan 3". */
export function formatProjectionDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseDayMs(iso: string): number {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).getTime();
}

/** Signed calendar days from `fromIso` to `toIso` (positive = later). */
export function etaDayDelta(fromIso: string, toIso: string): number {
  const ms = 86_400_000;
  return Math.round((parseDayMs(toIso) - parseDayMs(fromIso)) / ms);
}

/** e.g. "Jan 3 → Jan 14 (+11 days)" when ETA shifts after a reroute. */
export function formatRerouteEtaChange(
  previousEta: string | null,
  nextEta: string | null,
): string | null {
  if (!previousEta || !nextEta || previousEta.slice(0, 10) === nextEta.slice(0, 10)) {
    return null;
  }
  const delta = etaDayDelta(previousEta, nextEta);
  const sign = delta > 0 ? `+${delta}` : `${delta}`;
  const dayWord = Math.abs(delta) === 1 ? "day" : "days";
  return `${formatProjectionDate(previousEta)} → ${formatProjectionDate(nextEta)} (${sign} ${dayWord})`;
}

export type EtaCopy = {
  /** Answers "will I make it?" — false when projected late; null if unknown. */
  willMakeItOnTime: boolean | null;
  headline: string;
  detail: string;
};

export type TripStatusSummary = {
  etaDateLabel: string | null;
  paceLabel: string;
  onTrack: boolean | null;
  savedCurrent: number;
  savedTarget: number;
  progressPercent: number;
};

/** Compact copy for the trip status bar (ETA · pace · saved). */
export function buildTripStatusSummary(
  projection: ProjectionResult,
): TripStatusSummary {
  const progressPercent = Math.round(projection.progressPercent * 100);
  const savedCurrent = Math.round(projection.currentSaved);
  const savedTarget = projection.targetAmount;

  if (!projection.etaDate) {
    return {
      etaDateLabel: null,
      paceLabel: "route unclear",
      onTrack: null,
      savedCurrent,
      savedTarget,
      progressPercent,
    };
  }

  const etaDateLabel = formatProjectionDate(projection.etaDate);
  const days = projection.daysEarlyOrLate ?? 0;

  if (projection.onTrack && days > 0) {
    return {
      etaDateLabel,
      paceLabel: `${days} day${days === 1 ? "" : "s"} early`,
      onTrack: true,
      savedCurrent,
      savedTarget,
      progressPercent,
    };
  }

  if (projection.onTrack) {
    return {
      etaDateLabel,
      paceLabel: "on time",
      onTrack: true,
      savedCurrent,
      savedTarget,
      progressPercent,
    };
  }

  const late = Math.abs(days);
  return {
    etaDateLabel,
    paceLabel: `${late} day${late === 1 ? "" : "s"} late`,
    onTrack: false,
    savedCurrent,
    savedTarget,
    progressPercent,
  };
}

export function buildEtaCopy(projection: ProjectionResult): EtaCopy {
  const targetLabel = formatProjectionDate(projection.targetDate);

  if (!projection.etaDate) {
    return {
      willMakeItOnTime: null,
      headline: "Route unclear",
      detail:
        "At your current pace, savings may not reach your goal in the next two years. Try rerouting after you sync fresh Nessie data or adjust your destination.",
    };
  }

  const arrive = formatProjectionDate(projection.etaDate);
  const days = projection.daysEarlyOrLate ?? 0;

  if (projection.onTrack && days > 0) {
    return {
      willMakeItOnTime: true,
      headline: "You'll make it",
      detail: `At your current pace, you'll arrive ${arrive} — ${days} day${days === 1 ? "" : "s"} early.`,
    };
  }

  if (projection.onTrack) {
    return {
      willMakeItOnTime: true,
      headline: "You'll make it",
      detail: `At your current pace, you'll arrive by ${targetLabel} — on time.`,
    };
  }

  const late = Math.abs(days);
  return {
    willMakeItOnTime: false,
    headline: "You won't make it on time",
    detail: `At your current pace, you'll arrive ${arrive}, ${late} day${late === 1 ? "" : "s"} late.`,
  };
}

export function sampleDailySeries(
  series: DailyPoint[],
  maxPoints = 90,
): DailyPoint[] {
  if (series.length <= maxPoints) return series;
  const step = Math.ceil(series.length / maxPoints);
  const out: DailyPoint[] = [];
  for (let i = 0; i < series.length; i += step) {
    out.push(series[i]!);
  }
  const last = series[series.length - 1]!;
  if (out[out.length - 1]?.date !== last.date) out.push(last);
  return out;
}

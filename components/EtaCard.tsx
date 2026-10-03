"use client";

import { EtaBalanceChart } from "@/components/EtaBalanceChart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ReroutingBadge } from "@/components/ReroutingBadge";
import { buildEtaCopy, formatRerouteEtaChange } from "@/lib/projection/eta-copy";
import type { ProjectionResult } from "@/lib/projection/engine";

type Props = {
  projection: ProjectionResult | null;
  previousProjection?: ProjectionResult | null;
  rerouting?: boolean;
  goalLabel?: string;
};

export function EtaCard({
  projection,
  previousProjection,
  rerouting,
  goalLabel,
}: Props) {
  if (!projection) {
    return (
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle>ETA</CardTitle>
          <CardDescription>Set a destination to see your arrival date.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pct = Math.round(projection.progressPercent * 100);
  const { willMakeItOnTime, headline, detail } = buildEtaCopy(projection);
  const etaChange =
    !rerouting && previousProjection
      ? formatRerouteEtaChange(
          previousProjection.etaDate,
          projection.etaDate,
        )
      : null;

  const statusClass =
    willMakeItOnTime === true
      ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
      : willMakeItOnTime === false
        ? "border-amber-500/40 bg-amber-950/25 text-amber-100"
        : "border-slate-600 bg-slate-900/50 text-slate-300";

  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle>ETA prediction</CardTitle>
          <CardDescription>
            {goalLabel ? `Destination: ${goalLabel}` : "Will you make it?"}
          </CardDescription>
        </div>
        {rerouting && <ReroutingBadge />}
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`rounded-lg border px-3 py-2.5 ${statusClass}`}
          role="status"
        >
          <p className="text-sm font-medium">{headline}</p>
          {etaChange && (
            <p className="mt-1 text-sm font-medium tabular-nums text-amber-200">
              {etaChange}
            </p>
          )}
          <p className="mt-1 text-sm leading-relaxed opacity-95">{detail}</p>
        </div>
        <EtaBalanceChart
          series={projection.dailySeries}
          targetAmount={projection.targetAmount}
          targetDate={projection.targetDate}
          etaDate={projection.etaDate}
          previousSeries={previousProjection?.dailySeries}
          showComparison={Boolean(etaChange)}
        />
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>${projection.currentSaved.toFixed(0)} saved</span>
            <span>${projection.targetAmount} goal</span>
          </div>
          <Progress value={pct} className="h-2" />
          <p className="text-xs text-slate-500">
            Progress uses your Nessie savings balance toward this goal.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

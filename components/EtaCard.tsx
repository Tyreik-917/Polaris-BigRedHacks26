"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ProjectionResult } from "@/lib/projection/engine";

type Props = {
  projection: ProjectionResult | null;
  goalLabel?: string;
};

export function EtaCard({ projection, goalLabel }: Props) {
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
  let etaLine = "Calculating route…";
  if (projection.etaDate) {
    if (projection.onTrack) {
      etaLine = `On track — arrive by ${projection.targetDate}`;
    } else {
      const late = projection.daysEarlyOrLate
        ? Math.abs(projection.daysEarlyOrLate)
        : 0;
      etaLine = `At your pace, you'll reach $${projection.targetAmount} on ${projection.etaDate} — ${late} days late.`;
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader>
        <CardTitle>Your ETA</CardTitle>
        <CardDescription>
          {goalLabel ? `Destination: ${goalLabel}` : "Savings toward goal"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-200">{etaLine}</p>
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

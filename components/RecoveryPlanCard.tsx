"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RecoveryPlan } from "@/lib/advice/recovery-plan";
import { recoveryPlanDetail } from "@/lib/advice/recovery-plan";
import { Route } from "lucide-react";

type Props = {
  plan: RecoveryPlan;
  afterReroute?: boolean;
  loading?: boolean;
};

export function RecoveryPlanCard({ plan, afterReroute, loading }: Props) {
  return (
    <Card className="border-amber-900/50 bg-gradient-to-br from-slate-900/80 to-amber-950/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-amber-300/90">
          <Route className="h-4 w-4" aria-hidden />
          <CardTitle className="text-lg">Recovery plan</CardTitle>
        </div>
        <CardDescription>
          {afterReroute
            ? "After your reroute — a short path back on schedule"
            : "A few moves to get back on schedule"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-400">Updating your recovery plan…</p>
        ) : (
          <>
            <p className="text-base leading-relaxed text-slate-100">
              {plan.headline}
            </p>
            <p className="text-sm text-slate-400">{recoveryPlanDetail(plan)}</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
              {plan.moves.map((move) => (
                <li key={move.id}>
                  {move.text.charAt(0).toUpperCase() + move.text.slice(1)}
                </li>
              ))}
            </ol>
          </>
        )}
      </CardContent>
    </Card>
  );
}

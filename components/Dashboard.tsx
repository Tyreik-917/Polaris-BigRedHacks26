"use client";

import { ConstellationView } from "@/components/ConstellationView";
import { DirectionsPanel } from "@/components/DirectionsPanel";
import { EtaCard } from "@/components/EtaCard";
import { GoalInput } from "@/components/GoalInput";
import { ImaginePostcard } from "@/components/ImaginePostcard";
import { VoiceNavigator } from "@/components/VoiceNavigator";
import { Button } from "@/components/ui/button";
import { useFinancialSnapshot } from "@/hooks/useFinancialSnapshot";
import { useGoal } from "@/hooks/useGoal";
import type { TipCandidate } from "@/lib/advice/rules";
import type { Goal } from "@/lib/goals/types";
import type { FinancialSnapshot } from "@/lib/nessie/types";
import type { ProjectionResult } from "@/lib/projection/engine";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function Dashboard() {
  const { goal, hydrated, setGoal, updateGoal, clearGoal } = useGoal();
  const { snapshot, sync, loading: syncLoading } = useFinancialSnapshot();
  const [projection, setProjection] = useState<ProjectionResult | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [tips, setTips] = useState<TipCandidate[]>([]);
  const [narration, setNarration] = useState("");
  const [navLoading, setNavLoading] = useState(false);

  const runPipeline = useCallback(
    async (g: Goal, snap?: FinancialSnapshot | null) => {
      const currentSnap = snap ?? snapshot;
      if (!currentSnap) return;
      const projRes = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: g, snapshot: currentSnap }),
      });
      if (!projRes.ok) return;
      const projData = (await projRes.json()) as { projection: ProjectionResult };
      setProjection(projData.projection);

      setNavLoading(true);
      const navRes = await fetch("/api/navigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: g, snapshot: currentSnap }),
      });
      setNavLoading(false);
      if (navRes.ok) {
        const nav = (await navRes.json()) as {
          lines: string[];
          tips: TipCandidate[];
          narration: string;
        };
        setLines(nav.lines);
        setTips(nav.tips);
        setNarration(nav.narration);
      }
    },
    [snapshot],
  );

  const handleGoal = useCallback(
    async (g: Goal) => {
      setGoal(g);
      toast.success("Destination set — plotting route.");
      const imagineRes = await fetch("/api/imagine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: g.label }),
      });
      if (imagineRes.ok) {
        const img = (await imagineRes.json()) as { url?: string | null };
        if (img.url) updateGoal({ imagineUrl: img.url });
      }
      const snap = snapshot ?? (await sync());
      if (snap) await runPipeline(g, snap);
    },
    [runPipeline, setGoal, snapshot, sync, updateGoal],
  );

  const reroute = useCallback(async () => {
    toast("Rerouting…", { description: "Refreshing Nessie data and ETA." });
    const snap = await sync();
    if (goal && snap) await runPipeline(goal, snap);
  }, [goal, runPipeline, sync]);

  useEffect(() => {
    if (!hydrated) return;
    void sync();
  }, [hydrated, sync]);

  useEffect(() => {
    if (goal && snapshot) void runPipeline(goal, snapshot);
  }, [goal, snapshot, runPipeline]);

  const progress = projection?.progressPercent ?? 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-400/80">
          Navigation for your finances
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">
          Polaris
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-400">
          Ancient sailors navigated by the stars — Polaris navigates by yours.
          Your goal becomes a constellation; each star lights as you get closer.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <ConstellationView progressPercent={progress} />
          {!goal ? (
            <GoalInput onSubmit={(g) => void handleGoal(g)} disabled={syncLoading} />
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
              <p className="font-medium text-slate-100">{goal.label}</p>
              <p>
                ${goal.targetAmount} by {goal.targetDate}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-700"
                  onClick={() => void reroute()}
                  disabled={syncLoading}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Reroute
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearGoal();
                    setProjection(null);
                    setLines([]);
                  }}
                >
                  New destination
                </Button>
              </div>
            </div>
          )}
          <VoiceNavigator
            mode="set_goal"
            onGoalHeard={(g) => void handleGoal(g)}
            disabled={syncLoading}
          />
        </div>

        <div className="space-y-4">
          <EtaCard projection={projection} goalLabel={goal?.label} />
          {goal && (
            <ImaginePostcard
              label={goal.label}
              imageUrl={goal.imagineUrl}
              progressPercent={progress}
            />
          )}
          <DirectionsPanel lines={lines} tips={tips} loading={navLoading} />
          {narration && goal && (
            <VoiceNavigator
              mode="read_directions"
              narration={narration}
              disabled={navLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

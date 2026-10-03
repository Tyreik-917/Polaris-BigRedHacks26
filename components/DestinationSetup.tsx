"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { polarisFetch } from "@/lib/api/client-fetch";
import {
  goalFromQuickPick,
  QUICK_PICK_DESTINATIONS,
} from "@/lib/goals/quick-picks";
import { VoiceNavigator } from "@/components/VoiceNavigator";
import { parseGoalInput, type Goal } from "@/lib/goals/types";
import { useState } from "react";

type Props = {
  onSubmit: (goal: Goal) => void;
  disabled?: boolean;
  /** When true, show Polaris intro copy above the picker */
  showIntro?: boolean;
  firstName?: string;
};

function defaultDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 2);
  return d.toISOString().slice(0, 10);
}

export function DestinationSetup({
  onSubmit,
  disabled,
  showIntro = false,
  firstName,
}: Props) {
  const [freeform, setFreeform] = useState("");
  const [parsing, setParsing] = useState(false);

  async function submitFreeform() {
    setParsing(true);
    try {
      const res = await polarisFetch("/api/goal/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: freeform }),
      });
      if (res.ok) {
        const data = (await res.json()) as { goal: Goal };
        onSubmit(data.goal);
        return;
      }
    } finally {
      setParsing(false);
    }
    const fallback = parseGoalInput({
      label: freeform.slice(0, 80) || "My goal",
      targetAmount: 400,
      targetDate: defaultDate(),
    });
    if (fallback) onSubmit(fallback);
  }

  function pickChip(id: string) {
    const pick = QUICK_PICK_DESTINATIONS.find((p) => p.id === id);
    if (!pick) return;
    const goal = goalFromQuickPick(pick);
    if (goal) onSubmit(goal);
  }

  const greeting = firstName ? `Hi ${firstName}, ` : "";

  return (
    <div className="space-y-4">
      {showIntro && (
        <div className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400/80">
            Polaris
          </p>
          <p className="text-lg leading-relaxed text-slate-200">
            {greeting}Welcome to Polaris, where every goal has a route.
          </p>
          <p className="text-2xl font-medium text-slate-50">Where to?</p>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {QUICK_PICK_DESTINATIONS.map((pick) => (
          <Button
            key={pick.id}
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-slate-600 bg-slate-900/60 text-slate-100 hover:border-sky-500/60 hover:bg-sky-950/40"
            disabled={disabled}
            onClick={() => pickChip(pick.id)}
          >
            {pick.chipLabel}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <Label htmlFor="destination-freeform" className="text-slate-300">
          Or say / type your destination
        </Label>
        <Input
          id="destination-freeform"
          className="mt-1 border-slate-700 bg-slate-950"
          placeholder='e.g. "$400 for flight home by Dec 15"'
          value={freeform}
          onChange={(e) => setFreeform(e.target.value)}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && freeform.trim() && !disabled && !parsing) {
              void submitFreeform();
            }
          }}
        />
        <Button
          type="button"
          className="mt-2 w-full"
          disabled={disabled || parsing || !freeform.trim()}
          onClick={() => void submitFreeform()}
        >
          {parsing ? "Parsing…" : "Set destination"}
        </Button>
        <div className="mt-4 border-t border-slate-800 pt-4">
          <p className="mb-2 text-xs text-slate-500">
            Hold the mic and say your destination — Grok Voice turns speech into a
            goal.
          </p>
          <VoiceNavigator
            mode="set_goal"
            disabled={disabled || parsing}
            onGoalHeard={onSubmit}
          />
        </div>
      </div>
    </div>
  );
}

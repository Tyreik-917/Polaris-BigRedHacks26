"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseGoalInput, type Goal } from "@/lib/goals/types";
import { useState } from "react";

type Props = {
  onSubmit: (goal: Goal) => void;
  disabled?: boolean;
};

export function GoalInput({ onSubmit, disabled }: Props) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [freeform, setFreeform] = useState("");
  const [parsing, setParsing] = useState(false);

  function submitStructured() {
    const goal = parseGoalInput({
      label,
      targetAmount: Number(amount),
      targetDate: date,
    });
    if (goal) onSubmit(goal);
  }

  async function submitFreeform() {
    setParsing(true);
    try {
      const res = await fetch("/api/goal/parse", {
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
      targetAmount: Number(amount) || 400,
      targetDate: date || defaultDate(),
    });
    if (fallback) onSubmit(fallback);
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div>
        <Label htmlFor="freeform">Say or type your destination</Label>
        <Input
          id="freeform"
          className="mt-1 border-slate-700 bg-slate-950"
          placeholder='e.g. "$400 for flight home by Dec 15"'
          value={freeform}
          onChange={(e) => setFreeform(e.target.value)}
          disabled={disabled}
        />
        <Button
          type="button"
          className="mt-2 w-full"
          disabled={disabled || parsing || !freeform.trim()}
          onClick={() => void submitFreeform()}
        >
          {parsing ? "Parsing…" : "Set destination"}
        </Button>
      </div>
      <details className="text-sm text-slate-400">
        <summary className="cursor-pointer">Manual fields</summary>
        <div className="mt-3 space-y-2">
          <Input
            placeholder="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="border-slate-700 bg-slate-950"
          />
          <Input
            placeholder="Target amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border-slate-700 bg-slate-950"
          />
          <Input
            placeholder="Target date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-slate-700 bg-slate-950"
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={disabled}
            onClick={submitStructured}
          >
            Save manual goal
          </Button>
        </div>
      </details>
    </div>
  );
}

function defaultDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 2);
  return d.toISOString().slice(0, 10);
}

"use client";

import { DestinationSetup } from "@/components/DestinationSetup";
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

  function submitStructured() {
    const goal = parseGoalInput({
      label,
      targetAmount: Number(amount),
      targetDate: date,
    });
    if (goal) onSubmit(goal);
  }

  return (
    <div className="space-y-4">
      <DestinationSetup onSubmit={onSubmit} disabled={disabled} />
      <details className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
        <summary className="cursor-pointer">Manual fields</summary>
        <div className="mt-3 space-y-2">
          <Label htmlFor="goal-label" className="sr-only">
            Label
          </Label>
          <Input
            id="goal-label"
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

"use client";

import { demoPurchase, demoReset, demoSamPay, eventsKey } from "@/lib/api";
import { useUIStore } from "@/lib/store";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  goalId: string;
};

export function DemoPanel({ goalId }: Props) {
  const open = useUIStore((s) => s.demoPanelOpen);
  const setOpen = useUIStore((s) => s.setDemoPanelOpen);
  const qc = useQueryClient();

  if (!open) return null;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: eventsKey(goalId, "") });
  };

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 flex flex-col gap-2 px-4 md:px-8">
      <div className="rounded-2xl border border-border bg-card p-3 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Demo controls
          </p>
          <button
            type="button"
            className="text-xs text-muted"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="h-11 rounded-xl bg-offcourse-bg text-sm font-medium text-offcourse"
            onClick={() => {
              void demoPurchase().then(invalidate);
            }}
          >
            Chipotle −$32.40
          </button>
          <button
            type="button"
            className="h-11 rounded-xl bg-panel text-sm text-ink"
            onClick={() => {
              void demoSamPay().then(invalidate);
            }}
          >
            Sam pays $25
          </button>
          <button
            type="button"
            className="h-11 rounded-xl border border-border text-sm text-muted"
            onClick={() => {
              void demoReset().then(invalidate);
            }}
          >
            Reset Maya
          </button>
        </div>
      </div>
    </div>
  );
}

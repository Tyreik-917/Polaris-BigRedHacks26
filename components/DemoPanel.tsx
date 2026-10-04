"use client";

import {
  allEventsKey,
  demoPurchase,
  demoReset,
  demoSamPay,
  demoTips,
} from "@/lib/api";
import { useUIStore } from "@/lib/store";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  goalId: string;
};

export function DemoPanel({ goalId }: Props) {
  const open = useUIStore((s) => s.demoPanelOpen);
  const setOpen = useUIStore((s) => s.setDemoPanelOpen);
  const resetTrip = useUIStore((s) => s.resetTrip);
  const qc = useQueryClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const run = async (action: () => Promise<void>, onDone?: () => void) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      void qc.invalidateQueries({ queryKey: allEventsKey(goalId) });
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Demo action failed.");
    } finally {
      setBusy(false);
    }
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
            disabled={busy}
            className="h-11 rounded-xl bg-star/15 text-sm font-medium text-star disabled:opacity-50"
            onClick={() => void run(demoTips)}
          >
            Tips +$85 (faster route)
          </button>
          <button
            type="button"
            disabled={busy}
            className="h-11 rounded-xl bg-offcourse-bg text-sm font-medium text-offcourse disabled:opacity-50"
            onClick={() => void run(demoPurchase)}
          >
            Chipotle −$32.40
          </button>
          <button
            type="button"
            disabled={busy}
            className="h-11 rounded-xl bg-panel text-sm text-ink disabled:opacity-50"
            onClick={() => void run(demoSamPay)}
          >
            Sam pays $25
          </button>
          <button
            type="button"
            disabled={busy}
            className="h-11 rounded-xl border border-border text-sm text-muted disabled:opacity-50"
            onClick={() =>
              void run(demoReset, () => {
                // The server deleted this goal, so start a fresh trip.
                resetTrip();
                qc.removeQueries();
                router.push("/destination");
              })
            }
          >
            Reset Maya
          </button>
        </div>
      </div>
    </div>
  );
}

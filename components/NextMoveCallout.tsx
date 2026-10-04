"use client";

import type { Move } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Volume2 } from "lucide-react";

type Props = {
  move: Move;
  onSpeak?: () => void;
  className?: string;
};

export function NextMoveCallout({ move, onSpeak, className }: Props) {
  return (
    <button
      type="button"
      onClick={onSpeak}
      className={cn(
        "max-w-[160px] rounded-xl border border-border bg-card p-2 text-left shadow-lg",
        className,
      )}
      aria-label={`Next move: ${move.label}`}
    >
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-star">
        <Volume2 className="h-3 w-3" aria-hidden />
        Next move
      </div>
      <p className="mt-1 text-[12px] font-medium leading-snug text-ink">
        {move.label}
      </p>
      <p className="mt-1 text-[11px] text-muted">
        {move.daysGained > 0
          ? `ETA ${move.daysGained} day${move.daysGained === 1 ? "" : "s"} sooner`
          : `Saves $${move.savings}`}
      </p>
    </button>
  );
}

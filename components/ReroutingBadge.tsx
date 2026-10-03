"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function ReroutingBadge({ className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-amber-500/45 bg-amber-950/90 px-2.5 py-0.5 text-xs font-medium text-amber-100 shadow-sm ring-1 ring-amber-800/40",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      Rerouting…
    </span>
  );
}

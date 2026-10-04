"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** New money shortened the trip: gold "Faster route found" instead of orange. */
  faster?: boolean;
};

export function ReroutingBadge({ className, faster }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold",
        faster ? "bg-[#3a3015] text-star" : "bg-offcourse-bg text-offcourse",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <RefreshCw
        className={cn("h-3.5 w-3.5", !faster && "animate-spin")}
        aria-hidden
      />
      {faster ? "Faster route found" : "Rerouting…"}
    </span>
  );
}

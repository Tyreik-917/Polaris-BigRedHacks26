"use client";

import { formatSpokenDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

type Props = {
  from: "polaris" | "user";
  children: string;
  spokenDurationSec?: number;
  className?: string;
};

export function ChatBubble({
  from,
  children,
  spokenDurationSec,
  className,
}: Props) {
  const isUser = from === "user";

  if (!isUser) {
    return (
      <div className={cn("flex items-start gap-2.5", className)}>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1b2447]"
          aria-hidden
        >
          <Star className="h-4 w-4 fill-star text-star" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-[4px] bg-bubble px-4 py-3 text-[15px] leading-snug text-ink">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <div className="max-w-[85%] rounded-2xl rounded-br-[4px] bg-star px-4 py-3 text-[15px] font-medium leading-snug text-star-ink">
        {children}
      </div>
      {spokenDurationSec != null && (
        <p className="text-[12px] text-muted">
          Spoken · {formatSpokenDuration(spokenDurationSec)}
        </p>
      )}
    </div>
  );
}

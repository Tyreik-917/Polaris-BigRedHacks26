"use client";

import { formatSpokenDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

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

  return (
    <div className={cn("flex flex-col gap-1", isUser && "items-end", className)}>
      <div
        className={cn(
          "max-w-[92%] px-4 py-3 text-[15px] leading-snug",
          isUser
            ? "rounded-2xl rounded-br rounded-br-[4px] bg-star text-star-ink"
            : "rounded-2xl rounded-bl-[4px] bg-bubble text-ink",
        )}
      >
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

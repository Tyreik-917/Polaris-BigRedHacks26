"use client";

import { ReroutingBadge } from "@/components/ReroutingBadge";
import { Star } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  rightSlot?: ReactNode;
  rerouting?: boolean;
  rerouteFaster?: boolean;
  recovered?: boolean;
  onAvatarPress?: () => void;
};

export function AppHeader({
  rightSlot,
  rerouting,
  rerouteFaster,
  recovered,
  onAvatarPress,
}: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 fill-star text-star" aria-hidden />
        <span className="font-heading text-lg font-bold tracking-tight text-ink">
          Polaris
        </span>
      </div>
      <div className="flex items-center gap-2">
        {rerouting && <ReroutingBadge faster={rerouteFaster} />}
        {recovered && (
          <span className="rounded-full bg-star/20 px-3 py-1 text-xs font-medium text-star">
            Back on course
          </span>
        )}
        {rightSlot ?? (
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-panel text-sm font-medium text-ink"
            aria-label="Profile"
            onPointerDown={onAvatarPress}
          >
            M
          </button>
        )}
      </div>
    </header>
  );
}

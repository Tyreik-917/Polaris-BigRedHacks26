"use client";

import type { Move } from "@/lib/types";
import { formatMonDay } from "@/lib/format";

type Props = {
  targetDate: string;
  moves: Move[];
  appliedMoveIds: string[];
  onApply: (moveId: string) => void;
};

export function RecoveryPlan({
  targetDate,
  moves,
  appliedMoveIds,
  onApply,
}: Props) {
  if (moves.length === 0) return null;

  return (
    <div className="space-y-3 text-[15px] leading-snug text-ink">
      <p>
        Rerouting. Three moves get you back to {formatMonDay(targetDate)}:
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-[14px]">
        {moves.map((move) => {
          const applied = appliedMoveIds.includes(move.id);
          return (
            <li key={move.id} className="pl-1">
              <span>{move.label}</span>
              {move.action && (
                <button
                  type="button"
                  disabled={applied}
                  onClick={() => onApply(move.id)}
                  className="ml-2 mt-1 inline-flex rounded-full bg-star px-3 py-1 text-[13px] font-medium text-star-ink disabled:opacity-50"
                >
                  {applied
                    ? "Requested"
                    : move.action?.type === "p2p_request"
                      ? `Request $${move.action.amount} from Sam`
                      : "Apply"}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

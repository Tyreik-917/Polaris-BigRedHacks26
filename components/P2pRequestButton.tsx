"use client";

import { Button } from "@/components/ui/button";
import {
  p2pRequestButtonLabel,
  type P2pAction,
} from "@/lib/p2p/actions";
import { HandCoins, Loader2 } from "lucide-react";

type Props = {
  action: P2pAction;
  busy?: boolean;
  showSimulatePaid?: boolean;
  onRequest: () => void;
  onSimulatePaid?: () => void;
  compact?: boolean;
};

export function P2pRequestButton({
  action,
  busy,
  showSimulatePaid,
  onRequest,
  onSimulatePaid,
  compact,
}: Props) {
  if (action.status === "paid") {
    return (
      <p className="text-sm text-emerald-300/90">
        ${action.amount} from {action.counterpartyName} collected — route updated.
      </p>
    );
  }

  if (action.status === "pending") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-sky-200/90">
          Request sent — waiting on {action.counterpartyName}.
          {action.etaImpactDays != null
            ? ` Payback moves your arrival up ${action.etaImpactDays} days.`
            : null}
        </p>
        {showSimulatePaid && onSimulatePaid && (
          <Button
            type="button"
            variant="outline"
            size={compact ? "sm" : "default"}
            className="border-emerald-800/60 text-emerald-100"
            disabled={busy}
            onClick={onSimulatePaid}
          >
            {busy ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
            ) : null}
            Simulate {action.counterpartyName} paid
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button
      type="button"
      size={compact ? "sm" : "default"}
      className="gap-2 bg-emerald-700 hover:bg-emerald-600"
      disabled={busy}
      onClick={onRequest}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <HandCoins className="h-4 w-4" aria-hidden />
      )}
      {p2pRequestButtonLabel(action)}
    </Button>
  );
}

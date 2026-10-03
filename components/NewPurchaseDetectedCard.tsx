"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPurchaseDetectionLine } from "@/lib/nessie/purchase-detection";
import type { NormalizedPurchase } from "@/lib/nessie/types";
import { Receipt, X } from "lucide-react";

type Props = {
  purchase: NormalizedPurchase;
  onDismiss: () => void;
  rerouting?: boolean;
};

export function NewPurchaseDetectedCard({
  purchase,
  onDismiss,
  rerouting,
}: Props) {
  return (
    <Card
      className="border-amber-900/50 bg-gradient-to-br from-amber-950/40 to-slate-950/80 ring-1 ring-amber-800/30"
      role="status"
      aria-live="polite"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex items-center gap-2 text-amber-300/95">
          <Receipt className="h-4 w-4 shrink-0" aria-hidden />
          <CardTitle className="text-base font-medium">
            {formatPurchaseDetectionLine(purchase)}
          </CardTitle>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-slate-400 hover:text-slate-200"
          aria-label="Dismiss purchase alert"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-amber-100/70">
          {rerouting
            ? "Updating your route from fresh Nessie data…"
            : "Polaris spotted this on Nessie and adjusted your ETA — no need to report it."}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

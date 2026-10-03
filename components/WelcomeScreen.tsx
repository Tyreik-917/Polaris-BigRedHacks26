"use client";

import { DestinationSetup } from "@/components/DestinationSetup";
import { FinancialCheckInCard } from "@/components/FinancialCheckInCard";
import { useFinancialSnapshot } from "@/hooks/useFinancialSnapshot";
import type { Goal } from "@/lib/goals/types";
import { useEffect } from "react";

type Props = {
  displayName: string;
  firstName?: string;
  onDestination: (goal: Goal) => void;
  destinationDisabled?: boolean;
};

export function WelcomeScreen({
  displayName,
  firstName,
  onDestination,
  destinationDisabled,
}: Props) {
  const { snapshot, sync, loading, error } = useFinancialSnapshot();

  useEffect(() => {
    void sync();
  }, [sync]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-4 py-12">
      <DestinationSetup
        showIntro
        firstName={firstName}
        disabled={destinationDisabled || (loading && !snapshot && !error)}
        onSubmit={onDestination}
      />

      <FinancialCheckInCard
        snapshot={snapshot}
        loading={loading}
        error={error}
        contextLine={`Linked for ${displayName} in this browser.`}
      />

      <p className="text-center text-xs text-slate-500">
        Tap a destination above to plot your route — Nessie keeps syncing in the
        background.
      </p>
    </div>
  );
}

"use client";

import {
  findNewPurchases,
  pickRouteAffectingPurchase,
} from "@/lib/nessie/purchase-detection";
import type { FinancialSnapshot } from "@/lib/nessie/types";
import type { Goal } from "@/lib/goals/types";
import { useCallback, useEffect, useRef } from "react";

const DEFAULT_INTERVAL_MS = 45_000;
const SEEN_KEY_PREFIX = "polaris-seen-purchase-ids:";

function loadSeenIds(customerId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(`${SEEN_KEY_PREFIX}${customerId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed.filter(Boolean));
  } catch {
    return new Set();
  }
}

function persistSeenIds(customerId: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    const list = [...ids].slice(-200);
    sessionStorage.setItem(
      `${SEEN_KEY_PREFIX}${customerId}`,
      JSON.stringify(list),
    );
  } catch {
    /* quota / private mode */
  }
}

type Options = {
  goal: Goal | null;
  enabled: boolean;
  customerId: string | null;
  snapshot: FinancialSnapshot | null;
  intervalMs?: number;
  syncSilent: () => Promise<FinancialSnapshot | null>;
  onDetected: (purchase: import("@/lib/nessie/types").NormalizedPurchase) => void;
};

export function usePurchaseWatch({
  goal,
  enabled,
  customerId,
  snapshot,
  intervalMs = DEFAULT_INTERVAL_MS,
  syncSilent,
  onDetected,
}: Options) {
  const previousRef = useRef<FinancialSnapshot | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const seedSeenFromSnapshot = useCallback((snap: FinancialSnapshot) => {
    if (!customerId) return;
    if (seenRef.current.size === 0) {
      seenRef.current = loadSeenIds(customerId);
    }
    let changed = false;
    for (const p of snap.purchases) {
      if (p.id && !seenRef.current.has(p.id)) {
        seenRef.current.add(p.id);
        changed = true;
      }
    }
    if (changed) persistSeenIds(customerId, seenRef.current);
  }, [customerId]);

  useEffect(() => {
    if (!snapshot || !customerId) return;
    seedSeenFromSnapshot(snapshot);
    previousRef.current = snapshot;
  }, [snapshot, customerId, seedSeenFromSnapshot]);

  useEffect(() => {
    if (!enabled || !goal || !customerId) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled || document.visibilityState === "hidden") return;
      const previous = previousRef.current;
      if (!previous) return;

      const next = await syncSilent();
      if (cancelled || !next) return;

      const newcomers = findNewPurchases(previous, next).filter(
        (p) => p.id && !seenRef.current.has(p.id),
      );

      for (const p of newcomers) {
        if (p.id) seenRef.current.add(p.id);
      }
      persistSeenIds(customerId, seenRef.current);

      const affecting = pickRouteAffectingPurchase(
        goal,
        previous,
        next,
        newcomers,
      );

      previousRef.current = next;

      if (affecting) {
        onDetectedRef.current(affecting);
      }
    };

    const id = window.setInterval(() => void tick(), intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, goal, customerId, intervalMs, syncSilent]);
}

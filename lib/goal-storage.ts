import { useMemo, useSyncExternalStore } from "react";
import type { Goal } from "@/lib/types";

const KEY = "polaris-goal-v2";

export function saveGoal(goal: Goal) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(goal));
}

export function loadGoal(id: string): Goal | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const goal = JSON.parse(raw) as Goal;
    return goal.id === id ? goal : null;
  } catch {
    return null;
  }
}

export function loadAnyGoal(): Goal | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Goal;
  } catch {
    return null;
  }
}

function readRawGoal(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Reads the saved goal without a hydration mismatch: the server (and first
 * client pass) see `null`, then the real value. `hydrated` tells the two apart.
 */
export function useStoredGoal(id: string): { goal: Goal | null; hydrated: boolean } {
  const raw = useSyncExternalStore<string | null | undefined>(
    subscribe,
    readRawGoal,
    () => undefined,
  );
  const goal = useMemo(() => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Goal;
      return parsed.id === id ? parsed : null;
    } catch {
      return null;
    }
  }, [raw, id]);
  return { goal, hydrated: raw !== undefined };
}

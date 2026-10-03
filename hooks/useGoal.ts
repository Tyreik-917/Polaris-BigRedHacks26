"use client";

import { DEFAULT_CONSTELLATION_ID, type Goal } from "@/lib/goals/types";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "polaris:goal";

export function useGoal() {
  const [goal, setGoalState] = useState<Goal | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setGoalState(JSON.parse(raw) as Goal);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setGoal = useCallback((next: Goal) => {
    setGoalState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const updateGoal = useCallback((patch: Partial<Goal>) => {
    setGoalState((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  const clearGoal = useCallback(() => {
    setGoalState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    goal,
    hydrated,
    setGoal,
    updateGoal,
    clearGoal,
    defaultConstellationId: DEFAULT_CONSTELLATION_ID,
  };
}

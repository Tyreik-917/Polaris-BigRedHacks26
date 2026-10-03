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

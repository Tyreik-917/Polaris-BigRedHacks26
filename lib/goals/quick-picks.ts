import { parseGoalInput, type Goal } from "@/lib/goals/types";

export type QuickPickDestination = {
  id: string;
  chipLabel: string;
  label: string;
  targetAmount: number;
  /** ISO date YYYY-MM-DD, or months from today */
  targetDate: string | { monthsFromNow: number };
};

export const QUICK_PICK_DESTINATIONS: QuickPickDestination[] = [
  {
    id: "save-1000-dec10",
    chipLabel: "$1,000 by Dec 10",
    label: "Save $1,000",
    targetAmount: 1000,
    targetDate: "2026-12-10",
  },
  {
    id: "flight-home",
    chipLabel: "Flight home",
    label: "Flight home",
    targetAmount: 400,
    targetDate: { monthsFromNow: 2 },
  },
  {
    id: "spring-break",
    chipLabel: "Spring break",
    label: "Spring break trip",
    targetAmount: 800,
    targetDate: { monthsFromNow: 4 },
  },
  {
    id: "laptop",
    chipLabel: "New laptop",
    label: "New laptop",
    targetAmount: 1200,
    targetDate: { monthsFromNow: 6 },
  },
  {
    id: "emergency",
    chipLabel: "Emergency fund",
    label: "Emergency fund",
    targetAmount: 500,
    targetDate: { monthsFromNow: 3 },
  },
];

function resolveTargetDate(
  targetDate: QuickPickDestination["targetDate"],
): string {
  if (typeof targetDate === "string") return targetDate;
  const d = new Date();
  d.setMonth(d.getMonth() + targetDate.monthsFromNow);
  return d.toISOString().slice(0, 10);
}

export function goalFromQuickPick(pick: QuickPickDestination): Goal | null {
  return parseGoalInput({
    label: pick.label,
    targetAmount: pick.targetAmount,
    targetDate: resolveTargetDate(pick.targetDate),
  });
}

export function defaultTargetDateMonthsFromNow(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

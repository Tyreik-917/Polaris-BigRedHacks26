export type Goal = {
  label: string;
  targetAmount: number;
  targetDate: string;
  /** When the user set this destination (journey start on the star route). */
  startDate?: string;
  constellationId: string;
  imagineUrl?: string;
};

export const DEFAULT_CONSTELLATION_ID = "ursa-minor";

export function parseGoalInput(raw: {
  label?: string;
  targetAmount?: number;
  targetDate?: string;
  constellationId?: string;
}): Goal | null {
  const label = raw.label?.trim();
  const targetAmount = raw.targetAmount;
  const targetDate = raw.targetDate?.trim();
  if (!label || targetAmount == null || targetAmount <= 0 || !targetDate) {
    return null;
  }
  const d = new Date(targetDate);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return {
    label,
    targetAmount,
    targetDate: d.toISOString().slice(0, 10),
    startDate: start.toISOString().slice(0, 10),
    constellationId: raw.constellationId ?? DEFAULT_CONSTELLATION_ID,
  };
}

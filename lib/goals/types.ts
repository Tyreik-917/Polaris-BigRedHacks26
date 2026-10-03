export type Goal = {
  label: string;
  targetAmount: number;
  targetDate: string;
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
  return {
    label,
    targetAmount,
    targetDate: d.toISOString().slice(0, 10),
    constellationId: raw.constellationId ?? DEFAULT_CONSTELLATION_ID,
  };
}

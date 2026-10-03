export type StarRecord = {
  hip: number;
  name?: string;
  ra: number;
  dec: number;
  mag: number;
};

export type ProjectedStar = StarRecord & { x: number; y: number; r: number };

/** Stereographic projection centered on north celestial pole (Ursa Minor). */
export function projectStars(
  stars: StarRecord[],
  width: number,
  height: number,
): ProjectedStar[] {
  const cx = width / 2;
  const cy = height / 2;
  const scale = Math.min(width, height) * 0.38;

  return stars.map((s) => {
    const raRad = (s.ra * 15 * Math.PI) / 180;
    const decRad = (s.dec * Math.PI) / 180;
    const pole = Math.PI / 2;
    const k = 2 / (1 + Math.sin(decRad));
    const x = cx + k * scale * Math.cos(decRad) * Math.sin(raRad);
    const y = cy - k * scale * Math.cos(decRad) * Math.cos(raRad);
    const r = Math.max(2.5, 6 - s.mag * 0.8);
    return { ...s, x, y, r };
  });
}

export function litStarCount(
  starCount: number,
  progressPercent: number,
): number {
  if (progressPercent >= 1) return starCount;
  return Math.max(1, Math.floor(progressPercent * starCount));
}

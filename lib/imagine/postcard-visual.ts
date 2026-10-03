/** Blur and opacity for destination postcards — clearer as savings progress. */
export function postcardProgressStyle(progressPercent: number) {
  const p = Math.min(1, Math.max(0, progressPercent));
  return {
    blurPx: Math.round((1 - p) * 12),
    opacity: 0.45 + p * 0.55,
  };
}

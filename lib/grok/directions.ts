import type { TipCandidate } from "@/lib/advice/rules";
import {
  renderTipFallback,
  tipsToNarrationFallback,
} from "@/lib/advice/rules";
import type { Goal } from "@/lib/goals/types";
import type { ProjectionResult } from "@/lib/projection/engine";
import { xaiChatCompletion } from "./client";

export async function generateDirections(
  goal: Goal,
  projection: ProjectionResult,
  tips: TipCandidate[],
): Promise<{ narration: string; lines: string[] }> {
  const fallbackLines = tips.map((t) => renderTipFallback(t));
  const fallback = tipsToNarrationFallback(tips);

  const system = `You are Polaris, a GPS for college finances. Turn the JSON facts into 3-5 short turn-by-turn directions.
Rules: Use ONLY numbers and dates from the JSON. Max 2 sentences per tip. Friendly, second person. No lectures.`;

  const user = JSON.stringify({
    goal,
    eta: {
      etaDate: projection.etaDate,
      onTrack: projection.onTrack,
      daysEarlyOrLate: projection.daysEarlyOrLate,
      currentSaved: projection.currentSaved,
    },
    tips: tips.map((t) => ({ templateKey: t.templateKey, facts: t.facts })),
  });

  const raw = await xaiChatCompletion([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  if (!raw) {
    return { narration: fallback, lines: fallbackLines };
  }

  const lines = raw
    .split(/\n+/)
    .map((l) => l.replace(/^[\d\-•.]+\s*/, "").trim())
    .filter(Boolean);

  return {
    narration: lines.join("\n\n"),
    lines: lines.length ? lines : fallbackLines,
  };
}

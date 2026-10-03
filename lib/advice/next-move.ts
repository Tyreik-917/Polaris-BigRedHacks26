import {
  renderTipFallback,
  type TipCandidate,
} from "@/lib/advice/rules";

export type NextMove = {
  tipId: string;
  text: string;
};

const NEXT_MOVE_BY_TEMPLATE: Record<
  string,
  (facts: TipCandidate["facts"]) => string
> = {
  food_pace: (f) =>
    `Next turn: cook twice this week instead of ordering in. That saves $${f.savings} and moves your arrival up ${f.etaImpactDays} days.`,
  receivable: (f) =>
    `Next turn: request $${f.amount} from ${f.name} with one tap below. Once they pay, your arrival moves up ${f.etaImpactDays} days.`,
  bill_soon: (f) =>
    `Next turn: set aside $${f.billAmount} for ${f.payee} before it posts in ${f.daysUntil} days. You'll still have about $${f.cushion} after it clears.`,
  off_track: (f) =>
    `Next turn: trim optional spending this week to get back toward ${f.targetDate}. Right now you're tracking ${f.daysLate} days late.`,
  on_track: (f) =>
    `Next turn: keep extras under about $${f.dailyBudget} per day until ${f.targetDate}. You're on course — small moves keep you there.`,
};

export function ensureNextTurnPrefix(line: string): string {
  const trimmed = line.trim();
  if (/^next turn:/i.test(trimmed)) return trimmed;
  return `Next turn: ${trimmed}`;
}

export function formatNextMoveFromTip(tip: TipCandidate): string {
  const fn = NEXT_MOVE_BY_TEMPLATE[tip.templateKey];
  if (fn) return fn(tip.facts);
  return ensureNextTurnPrefix(renderTipFallback(tip));
}

/** One GPS-style instruction per tip, in priority order. */
export function buildNextMoves(
  tips: TipCandidate[],
  lines: string[] = [],
): NextMove[] {
  const sorted = [...tips].sort((a, b) => a.priority - b.priority);

  if (lines.length > 0) {
    return lines.map((line, i) => ({
      tipId: sorted[i]?.id ?? `line-${i}`,
      text: ensureNextTurnPrefix(line),
    }));
  }

  return sorted.map((tip) => ({
    tipId: tip.id,
    text: formatNextMoveFromTip(tip),
  }));
}

export function primaryNextMove(
  tips: TipCandidate[],
  lines: string[] = [],
): NextMove | null {
  const moves = buildNextMoves(tips, lines);
  return moves[0] ?? null;
}

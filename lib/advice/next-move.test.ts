import { describe, expect, it } from "vitest";
import {
  buildNextMoves,
  ensureNextTurnPrefix,
  formatNextMoveFromTip,
  primaryNextMove,
} from "./next-move";
import type { TipCandidate } from "./rules";

const foodTip: TipCandidate = {
  id: "food",
  priority: 2,
  templateKey: "food_pace",
  facts: { foodSpend: 86, savings: 24, etaImpactDays: 6 },
};

describe("ensureNextTurnPrefix", () => {
  it("adds Next turn when missing", () => {
    expect(ensureNextTurnPrefix("Cook twice this week.")).toBe(
      "Next turn: Cook twice this week.",
    );
  });

  it("leaves existing prefix", () => {
    expect(ensureNextTurnPrefix("Next turn: already prefixed")).toBe(
      "Next turn: already prefixed",
    );
  });
});

describe("formatNextMoveFromTip", () => {
  it("formats food pace like GPS", () => {
    expect(formatNextMoveFromTip(foodTip)).toBe(
      "Next turn: cook twice this week instead of ordering in. That saves $24 and moves your arrival up 6 days.",
    );
  });
});

describe("buildNextMoves", () => {
  it("prefers Grok lines with prefix", () => {
    const moves = buildNextMoves([foodTip], ["Skip takeout twice this week."]);
    expect(moves).toHaveLength(1);
    expect(moves[0].text).toBe("Next turn: Skip takeout twice this week.");
  });

  it("falls back to tip templates", () => {
    const moves = buildNextMoves([foodTip], []);
    expect(moves[0].text).toContain("That saves $24");
  });

  it("primaryNextMove returns first item", () => {
    expect(primaryNextMove([foodTip], [])?.tipId).toBe("food");
  });
});

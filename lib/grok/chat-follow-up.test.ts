import { describe, expect, it, vi } from "vitest";
import { answerPolarisQuestion } from "./chat-follow-up";

vi.mock("./client", () => ({
  xaiChatCompletion: vi.fn(async () => null),
}));

const baseCtx = {
  goal: {
    label: "Spring break",
    targetAmount: 800,
    targetDate: "2026-06-01",
    constellationId: "ursa-minor",
    startDate: "2026-01-01",
  },
  projection: {
    currentSaved: 200,
    targetAmount: 800,
    targetDate: "2026-06-01",
    etaDate: "2026-07-15",
    daysEarlyOrLate: -45,
    onTrack: false,
    progressPercent: 0.25,
    dailySeries: [],
    avgDailySpendUsed: 18,
  },
  snapshot: {
    fetchedAt: "2026-01-01T00:00:00Z",
    customerId: "000000000000000000000000",
    checkingBalance: 400,
    savingsBalance: 200,
    totalLiquid: 600,
    bills: [],
    purchases: [],
    deposits: [],
    transfers: [],
    receivables: [],
    avgDailySpend: 18,
    avgDailyFoodSpend: 8,
    estimatedPaycheckAmount: 350,
    paycheckIntervalDays: 14,
  },
  directionLines: ["Next turn: trim $25/week from dining to save 12 days."],
  history: [],
};

describe("answerPolarisQuestion", () => {
  it("answers extra-shift hypotheticals when Grok is unavailable", async () => {
    const reply = await answerPolarisQuestion(
      baseCtx,
      "What if I pick up an extra shift?",
    );
    expect(reply.toLowerCase()).toContain("shift");
    expect(reply).toMatch(/\$350|350/);
  });
});

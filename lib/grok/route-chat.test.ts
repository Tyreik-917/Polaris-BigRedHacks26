import { describe, expect, it, vi } from "vitest";
import type { Goal, Projection } from "@/lib/types";
import { xaiChatCompletion } from "./client";
import {
  classifyRouteMessage,
  describeIncomeImpact,
  describePurchaseImpact,
} from "./route-chat";

vi.mock("./client", () => ({ xaiChatCompletion: vi.fn(async () => null) }));

const ref = new Date(2026, 9, 3);

describe("classifyRouteMessage", () => {
  it("logs a clear past purchase without calling Grok", async () => {
    vi.mocked(xaiChatCompletion).mockClear();
    expect(await classifyRouteMessage("I spent $30 on a textbook", ref)).toMatchObject({
      kind: "purchase",
      amount: 30,
    });
    expect(xaiChatCompletion).not.toHaveBeenCalled();
  });

  it("never logs a question that mentions money", async () => {
    expect(await classifyRouteMessage("Can I afford a $40 concert?", ref)).toEqual({
      kind: "question",
    });
    expect(await classifyRouteMessage("should I skip coffee this week", ref)).toEqual({
      kind: "question",
    });
  });

  it("asks Grok about ambiguous messages and trusts a valid answer", async () => {
    vi.mocked(xaiChatCompletion).mockResolvedValueOnce(
      '{"intent":"purchase","amount":12.5,"description":"lunch"}',
    );
    expect(await classifyRouteMessage("lunch with Sam was 12.50", ref)).toEqual({
      kind: "purchase",
      amount: 12.5,
      description: "lunch",
    });
  });
});

describe("classifyRouteMessage: income", () => {
  it.each([
    ["I got paid $500 today", "Paycheck", 500],
    ["I got $200 from my parents", "Money from someone", 200],
    ["Sam paid me back $25", "Money from someone", 25],
    ["picked up an extra shift and made $120", "Extra shift", 120],
    ["sold my old textbook for $40", "Sale", 40],
  ])("%s → income", async (text, description, amount) => {
    expect(await classifyRouteMessage(text, ref)).toEqual({ kind: "income", amount, description });
  });

  it("still logs spending that uses 'got'", async () => {
    expect(await classifyRouteMessage("I got a hoodie for $40", ref)).toMatchObject({
      kind: "purchase",
      amount: 40,
    });
  });
});

describe("describePurchaseImpact", () => {
  const goal = { name: "Flight home" } as Goal;
  const proj = (eta: string | null): Projection => ({
    goalId: "g", saved: 0, eta, daysLate: 0, onTrack: true, waypoints: [],
    nextMove: { id: "food_pace", label: "Cook twice this week", savings: 30, daysGained: 6 },
    recoveryMoves: [], etaWithMoves: null, computedAt: "",
  });
  const buy = { amount: 30, description: "textbook" };

  it("reports how many days the arrival slips", () => {
    expect(describePurchaseImpact(buy, goal, proj("2026-12-01"), proj("2026-12-05")))
      .toBe("Logged: textbook, $30. That pushes your arrival back 4 days, to Dec 5. Next move: cook twice this week to win back 6 days.");
  });

  it("explains when the goal falls out of reach", () => {
    expect(describePurchaseImpact(buy, goal, proj("2026-12-01"), proj(null)))
      .toMatch(/no longer reach flight home/);
  });

  it("explains a purchase while already off course", () => {
    expect(describePurchaseImpact(buy, goal, proj(null), proj(null)))
      .toMatch(/already off course.*\$30/);
  });
});

describe("describeIncomeImpact", () => {
  const goal = { name: "Flight home" } as Goal;
  const proj = (eta: string | null, onTrack = false): Projection => ({
    goalId: "g", saved: 0, eta, daysLate: 0, onTrack, waypoints: [],
    nextMove: null, recoveryMoves: [], etaWithMoves: null, computedAt: "",
  });
  const pay = { amount: 500, description: "Paycheck" };

  it("announces the goal coming back into reach", () => {
    expect(describeIncomeImpact(pay, goal, proj(null), proj("2026-12-01", true)))
      .toBe("Added: paycheck, $500. You're back on course: arriving Dec 1, in time for flight home.");
  });

  it("reports days gained", () => {
    expect(describeIncomeImpact(pay, goal, proj("2026-12-10"), proj("2026-12-04")))
      .toMatch(/moves your arrival up 6 days, to Dec 4/);
  });

  it("explains a partial catch-up while still off course", () => {
    expect(describeIncomeImpact(pay, goal, proj(null), proj(null)))
      .toMatch(/still short.*closes the gap by \$500/);
  });
});

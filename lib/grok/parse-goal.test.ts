import { describe, expect, it, vi } from "vitest";
import { parseGoalFromHeuristic, parseGoalFromText } from "./parse-goal";

vi.mock("./client", () => ({
  xaiChatCompletion: vi.fn(async () => null),
}));

describe("parseGoalFromText", () => {
  it("parses spoken savings goal with amount and deadline", async () => {
    const goal = await parseGoalFromText(
      "I want to save $400 for a flight home by December 15th.",
    );
    expect(goal).not.toBeNull();
    expect(goal?.targetAmount).toBe(400);
    expect(goal?.targetDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const month = Number(goal!.targetDate.slice(5, 7));
    expect(month).toBe(12);
  });
});

describe("parseGoalFromHeuristic", () => {
  const ref = new Date(2026, 9, 3); // Oct 3, 2026

  it("names the goal from the 'for …' phrase, not the whole sentence", () => {
    const goal = parseGoalFromHeuristic(
      "Save $400 for flight home by 2026-12-15",
      ref,
    );
    expect(goal?.label).toBe("Flight home");
    expect(goal?.targetAmount).toBe(400);
    expect(goal?.targetDate).toBe("2026-12-15");
  });

  it("resolves a month/day with no year to the next occurrence", () => {
    expect(parseGoalFromHeuristic("$400 for a flight by Dec 15", ref)?.targetDate)
      .toBe("2026-12-15");
    expect(parseGoalFromHeuristic("$800 for spring break by March 10th", ref)?.targetDate)
      .toBe("2027-03-10");
  });

  it("uses the dollar amount, not the first number it sees", () => {
    const goal = parseGoalFromHeuristic("Flight home Dec 15, need $1,200", ref);
    expect(goal?.targetAmount).toBe(1200);
  });

  it("accepts an amount without a dollar sign", () => {
    expect(parseGoalFromHeuristic("save 400 for a laptop", ref)?.targetAmount)
      .toBe(400);
  });
});

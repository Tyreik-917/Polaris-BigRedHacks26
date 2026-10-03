import { describe, expect, it, vi } from "vitest";
import { parseGoalFromText } from "./parse-goal";

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

import { parseGoalInput } from "@/lib/goals/types";
import { describe, expect, it } from "vitest";

describe("parseGoalInput", () => {
  it("rejects missing or non-positive amounts", () => {
    expect(
      parseGoalInput({
        label: "Trip",
        targetAmount: 0,
        targetDate: "2026-06-01",
      }),
    ).toBeNull();
    expect(
      parseGoalInput({
        label: "Trip",
        targetAmount: -100,
        targetDate: "2026-06-01",
      }),
    ).toBeNull();
  });

  it("rejects invalid dates", () => {
    expect(
      parseGoalInput({
        label: "Trip",
        targetAmount: 500,
        targetDate: "not-a-date",
      }),
    ).toBeNull();
  });

  it("rejects empty labels", () => {
    expect(
      parseGoalInput({
        label: "   ",
        targetAmount: 500,
        targetDate: "2026-06-01",
      }),
    ).toBeNull();
  });

  it("normalizes valid ISO-ish dates to YYYY-MM-DD", () => {
    const goal = parseGoalInput({
      label: "Japan",
      targetAmount: 1200,
      targetDate: "2026-12-15T23:59:59.000Z",
    });
    expect(goal?.targetDate).toBe("2026-12-15");
  });
});

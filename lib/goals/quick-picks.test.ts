import { describe, expect, it } from "vitest";
import { goalFromQuickPick, QUICK_PICK_DESTINATIONS } from "./quick-picks";

describe("goalFromQuickPick", () => {
  it("builds a valid goal for Flight home", () => {
    const pick = QUICK_PICK_DESTINATIONS.find((p) => p.id === "flight-home");
    expect(pick).toBeDefined();
    const goal = goalFromQuickPick(pick!);
    expect(goal).toMatchObject({
      label: "Flight home",
      targetAmount: 400,
    });
    expect(goal?.targetDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

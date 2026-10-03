import { describe, expect, it, vi } from "vitest";
import { parseSpendingReportFromText } from "./parse-spending-report";

vi.mock("./client", () => ({
  xaiChatCompletion: vi.fn(async () => null),
}));

describe("parseSpendingReportFromText", () => {
  it("parses Maya textbook example", async () => {
    const ref = new Date("2025-10-03T12:00:00.000Z");
    const report = await parseSpendingReportFromText(
      "Also had to buy an $85 textbook today",
      ref,
    );
    expect(report).not.toBeNull();
    expect(report?.amount).toBe(85);
    expect(report?.date).toBe("2025-10-03");
    expect(report?.description.toLowerCase()).toContain("textbook");
  });
});

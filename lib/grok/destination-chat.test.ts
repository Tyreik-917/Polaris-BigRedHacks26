import { describe, expect, it, vi } from "vitest";
import { destinationChat, fallbackDestinationReply } from "./destination-chat";
import { xaiChatCompletion } from "./client";

vi.mock("./client", () => ({ xaiChatCompletion: vi.fn(async () => null) }));

const ref = new Date(2026, 9, 3); // Oct 3, 2026
const user = (content: string) => ({ role: "user" as const, content });
const bot = (content: string) => ({ role: "assistant" as const, content });

describe("fallbackDestinationReply", () => {
  it("completes in one turn when everything is given", () => {
    const r = fallbackDestinationReply([user("Save $400 for a flight home by Dec 15")], ref);
    expect(r.goal).toEqual({ name: "Flight home", targetAmount: 400, targetDate: "2026-12-15" });
    expect(r.reply).toMatch(/plotting/i);
  });

  it("asks for each missing piece across turns", () => {
    const t1 = [user("I want to go home for winter break")];
    expect(fallbackDestinationReply(t1, ref)).toMatchObject({ goal: null });
    expect(fallbackDestinationReply(t1, ref).reply).toMatch(/how much/i);

    const t2 = [...t1, bot("How much?"), user("400")];
    expect(fallbackDestinationReply(t2, ref).reply).toMatch(/when/i);

    const t3 = [...t2, bot("When?"), user("by Dec 15")];
    expect(fallbackDestinationReply(t3, ref).goal).toEqual({
      name: "Winter break",
      targetAmount: 400,
      targetDate: "2026-12-15",
    });
  });

  it("asks what they're saving for when nothing is named", () => {
    expect(fallbackDestinationReply([user("$300")], ref).reply).toMatch(/saving for/i);
  });
});

describe("destinationChat", () => {
  it("uses Grok's reply and goal when valid", async () => {
    vi.mocked(xaiChatCompletion).mockResolvedValueOnce(
      '{"reply":"Locked in.","goal":{"name":"Laptop","targetAmount":1200,"targetDate":"2027-03-01"}}',
    );
    const r = await destinationChat([user("1200 for a laptop by March")], ref);
    expect(r).toEqual({
      reply: "Locked in.",
      goal: { name: "Laptop", targetAmount: 1200, targetDate: "2027-03-01" },
    });
  });

  it("falls back when Grok returns a goal dated in the past", async () => {
    vi.mocked(xaiChatCompletion).mockResolvedValueOnce(
      '{"reply":"Done","goal":{"name":"Laptop","targetAmount":1200,"targetDate":"2020-01-01"}}',
    );
    const r = await destinationChat([user("$1200 for a laptop")], ref);
    expect(r.goal).toBeNull();
    expect(r.reply).toMatch(/when/i);
  });
});

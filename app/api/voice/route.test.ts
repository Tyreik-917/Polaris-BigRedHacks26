import { POST } from "@/app/api/voice/route";
import { afterEach, describe, expect, it, vi } from "vitest";

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
  vi.unstubAllGlobals();
});

describe("POST /api/voice", () => {
  it("returns configured false without exposing secrets when XAI key is missing", async () => {
    delete process.env.XAI_API_KEY;

    const req = new Request("http://localhost/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "set_goal" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.configured).toBe(false);
    expect(body.realtimeUrl).toContain("grok-voice");
    expect(body.instructions).toMatch(/Polaris/i);
    expect(body.token).toBeUndefined();
  });

  it("returns ephemeral token when xAI client_secrets succeeds", async () => {
    process.env.XAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ value: "xai-realtime-client-secret-test" }),
      ),
    );

    const req = new Request("http://localhost/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "set_goal" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(body.configured).toBe(true);
    expect(body.token).toBe("xai-realtime-client-secret-test");
  });
});

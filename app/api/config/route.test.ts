import { GET } from "@/app/api/config/route";
import { afterEach, describe, expect, it } from "vitest";

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
});

describe("GET /api/config", () => {
  it("never exposes API keys or customer ids", async () => {
    process.env.NESSIE_API_KEY = "nessie-secret-key";
    process.env.XAI_API_KEY = "xai-secret-key";
    process.env.NESSIE_CUSTOMER_ID = "507f1f77bcf86cd799439011";

    const res = await GET();
    const body = await res.json();
    const serialized = JSON.stringify(body);

    expect(serialized).not.toContain("nessie-secret-key");
    expect(serialized).not.toContain("xai-secret-key");
    expect(serialized).not.toContain("507f1f77bcf86cd799439011");
    expect(body).toMatchObject({
      fixtureMode: expect.any(Boolean),
      hasServerDefaultCustomer: true,
      demoLoginAvailable: true,
      features: {
        nessie: expect.any(Boolean),
        grokChat: expect.any(Boolean),
        grokVoice: expect.any(Boolean),
        grokImagine: expect.any(Boolean),
      },
    });
  });
});

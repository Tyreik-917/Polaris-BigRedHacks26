import { POST } from "@/app/api/auth/demo/route";
import { afterEach, describe, expect, it } from "vitest";

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
});

describe("POST /api/auth/demo", () => {
  it("returns demo persona and customer id when configured", async () => {
    process.env.POLARIS_USE_FIXTURE = "false";
    process.env.NESSIE_CUSTOMER_ID = "507f1f77bcf86cd799439011";

    const res = await POST(new Request("http://localhost/api/auth/demo", { method: "POST" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.persona.fullName).toBe("Maya Chen");
    expect(body.customerId).toBe("507f1f77bcf86cd799439011");
    expect(body.fixtureMode).toBe(false);
  });

  it("uses fixture mode without exposing a customer id", async () => {
    process.env.POLARIS_USE_FIXTURE = "true";
    delete process.env.NESSIE_CUSTOMER_ID;

    const res = await POST(new Request("http://localhost/api/auth/demo", { method: "POST" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.fixtureMode).toBe(true);
    expect(body.customerId).toBeNull();
  });

  it("rejects when demo is not configured", async () => {
    process.env.POLARIS_USE_FIXTURE = "false";
    delete process.env.NESSIE_CUSTOMER_ID;

    const res = await POST(new Request("http://localhost/api/auth/demo", { method: "POST" }));
    expect(res.status).toBe(503);
  });
});

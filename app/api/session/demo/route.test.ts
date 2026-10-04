import { POST } from "@/app/api/session/demo/route";
import { afterEach, describe, expect, it } from "vitest";

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
});

function login(body: unknown) {
  return POST(
    new Request("http://localhost/api/session/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `test-${Math.random()}` },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/session/demo", () => {
  it("logs in with the demo account and sets the session cookie", async () => {
    process.env.POLARIS_USE_FIXTURE = "false";
    process.env.NESSIE_CUSTOMER_ID = "507f1f77bcf86cd799439011";

    const res = await login({ email: "TyreikR11@cornell.edu ", password: "123456789" });

    expect(res.status).toBe(200);
    expect((await res.json()).customerId).toBeTruthy();
    expect(res.headers.get("set-cookie")).toContain("polaris_customer_id=");
  });

  it.each([
    [{ email: "tyreikr11@cornell.edu", password: "wrong" }],
    [{ email: "someone@cornell.edu", password: "123456789" }],
    [{}],
  ])("rejects bad credentials %j without a cookie", async (body) => {
    process.env.NESSIE_CUSTOMER_ID = "507f1f77bcf86cd799439011";

    const res = await login(body);

    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("honors DEMO_LOGIN_EMAIL / DEMO_LOGIN_PASSWORD overrides", async () => {
    process.env.POLARIS_USE_FIXTURE = "true";
    process.env.DEMO_LOGIN_EMAIL = "judge@example.com";
    process.env.DEMO_LOGIN_PASSWORD = "stars";

    expect((await login({ email: "judge@example.com", password: "stars" })).status).toBe(200);
    expect((await login({ email: "tyreikr11@cornell.edu", password: "123456789" })).status).toBe(401);
  });
});

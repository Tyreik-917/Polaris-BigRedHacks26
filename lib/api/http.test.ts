import {
  jsonError,
  parseJsonBody,
  rateLimit,
  requireCustomerId,
  resolveCustomerId,
} from "@/lib/api/http";
import { NextResponse } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
});

function request(
  url: string,
  init?: RequestInit & { customerHeader?: string },
): Request {
  const headers = new Headers(init?.headers);
  if (init?.customerHeader) {
    headers.set("x-polaris-customer-id", init.customerHeader);
  }
  const { customerHeader: _drop, ...rest } = init ?? {};
  return new Request(url, { ...rest, headers });
}

describe("resolveCustomerId", () => {
  it("accepts valid Mongo ObjectId from header", () => {
    process.env.POLARIS_USE_FIXTURE = "false";
    delete process.env.NESSIE_CUSTOMER_ID;
    const id = resolveCustomerId(
      request("http://localhost/api/sync", { customerHeader: VALID_OBJECT_ID }),
    );
    expect(id).toBe(VALID_OBJECT_ID);
  });

  it("accepts valid UUID from query", () => {
    process.env.POLARIS_USE_FIXTURE = "false";
    delete process.env.NESSIE_CUSTOMER_ID;
    const id = resolveCustomerId(
      new Request(`http://localhost/api/sync?customerId=${VALID_UUID}`),
    );
    expect(id).toBe(VALID_UUID);
  });

  it("rejects path-style injection in customer id", () => {
    process.env.POLARIS_USE_FIXTURE = "false";
    delete process.env.NESSIE_CUSTOMER_ID;
    expect(
      resolveCustomerId(
        request("http://localhost/api/sync", {
          customerHeader: "../../../customers/other",
        }),
      ),
    ).toBeNull();
  });

  it("rejects SQL-ish payloads that are not valid ids", () => {
    process.env.POLARIS_USE_FIXTURE = "false";
    delete process.env.NESSIE_CUSTOMER_ID;
    expect(
      resolveCustomerId(
        request("http://localhost/api/sync", {
          customerHeader: "'; DROP TABLE accounts;--",
        }),
      ),
    ).toBeNull();
  });

  it("prefers header over query when both are valid", () => {
    process.env.POLARIS_USE_FIXTURE = "false";
    delete process.env.NESSIE_CUSTOMER_ID;
    const id = resolveCustomerId(
      new Request(
        `http://localhost/api/sync?customerId=${VALID_UUID}`,
        { headers: { "x-polaris-customer-id": VALID_OBJECT_ID } },
      ),
    );
    expect(id).toBe(VALID_OBJECT_ID);
  });

  it("falls back to server default when configured and valid", () => {
    process.env.POLARIS_USE_FIXTURE = "false";
    process.env.NESSIE_CUSTOMER_ID = VALID_OBJECT_ID;
    const id = resolveCustomerId(new Request("http://localhost/api/sync"));
    expect(id).toBe(VALID_OBJECT_ID);
  });

  it("ignores invalid server default", () => {
    process.env.POLARIS_USE_FIXTURE = "false";
    process.env.NESSIE_CUSTOMER_ID = "not-a-real-id";
    const id = resolveCustomerId(new Request("http://localhost/api/sync"));
    expect(id).toBeNull();
  });
});

describe("requireCustomerId", () => {
  it("returns 400 when id missing outside fixture mode", async () => {
    process.env.POLARIS_USE_FIXTURE = "false";
    delete process.env.NESSIE_CUSTOMER_ID;
    const result = requireCustomerId(new Request("http://localhost/api/sync"));
    expect(result).toBeInstanceOf(NextResponse);
    const res = result as NextResponse;
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/customer ID/i);
  });

  it("uses fixture placeholder when fixture mode and no id", () => {
    process.env.POLARIS_USE_FIXTURE = "true";
    delete process.env.NESSIE_CUSTOMER_ID;
    expect(requireCustomerId(new Request("http://localhost/api/sync"))).toBe(
      "000000000000000000000000",
    );
  });
});

describe("parseJsonBody", () => {
  it("returns 400 on malformed JSON", async () => {
    const result = await parseJsonBody(
      new Request("http://localhost/api/project", {
        method: "POST",
        body: "{ not json",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(400);
  });
});

describe("jsonError", () => {
  it("does not echo stack traces in body shape", async () => {
    const res = jsonError("Something failed", 502);
    const body = await res.json();
    expect(body).toEqual({ error: "Something failed" });
    expect(Object.keys(body)).toEqual(["error"]);
  });
});

describe("rateLimit", () => {
  it("blocks after limit for same key and ip", () => {
    const req = new Request("http://localhost/api/voice", {
      headers: { "x-forwarded-for": "203.0.113.50" },
    });
    const key = `test-voice-${Date.now()}`;
    expect(rateLimit(req, key, 2, 60_000)).toBeNull();
    expect(rateLimit(req, key, 2, 60_000)).toBeNull();
    const blocked = rateLimit(req, key, 2, 60_000);
    expect(blocked).toBeInstanceOf(NextResponse);
    expect((blocked as NextResponse).status).toBe(429);
  });
});

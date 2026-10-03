import { getServerConfig } from "@/lib/env.server";
import { NextResponse } from "next/server";

/** Nessie customer ids are Mongo ObjectIds (24 hex) or UUIDs depending on API version. */
const CUSTOMER_ID_PATTERN =
  /^([a-f0-9]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function resolveCustomerId(request: Request): string | null {
  const header = request.headers.get("x-polaris-customer-id")?.trim();
  const url = new URL(request.url);
  const query = url.searchParams.get("customerId")?.trim();

  const candidate = header || query;
  if (candidate) {
    if (!CUSTOMER_ID_PATTERN.test(candidate)) {
      return null;
    }
    return candidate;
  }

  const { defaultCustomerId } = getServerConfig();
  if (defaultCustomerId && CUSTOMER_ID_PATTERN.test(defaultCustomerId)) {
    return defaultCustomerId;
  }
  return null;
}

const FIXTURE_CUSTOMER_ID = "000000000000000000000000";

export function requireCustomerId(request: Request): string | NextResponse {
  const { useFixture } = getServerConfig();
  if (useFixture) {
    return resolveCustomerId(request) ?? FIXTURE_CUSTOMER_ID;
  }

  const id = resolveCustomerId(request);
  if (!id) {
    return jsonError(
      "Missing or invalid Nessie customer ID. Add your customer ID from the Capital One hackathon profile (Settings).",
      400,
    );
  }
  return id;
}

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Best-effort rate limit for serverless (per instance). */
export function rateLimit(
  request: Request,
  key: string,
  limit = 80,
  windowMs = 60_000,
): NextResponse | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous";
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  let bucket = buckets.get(bucketKey);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(bucketKey, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return jsonError("Too many requests. Please wait a moment and try again.", 429);
  }
  return null;
}

export async function parseJsonBody<T>(request: Request): Promise<T | NextResponse> {
  try {
    return (await request.json()) as T;
  } catch {
    return jsonError("Invalid JSON body");
  }
}

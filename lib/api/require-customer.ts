import { jsonError, resolveCustomerId } from "@/lib/api/http";
import { customerIdFromSession } from "@/lib/api/session";
import { getServerConfig } from "@/lib/env.server";
import { resolveMayaCustomerId } from "@/lib/seed-ids";
import { NextResponse } from "next/server";

/** Spec routes: prefer session cookie, then header/query, then Maya seed. */
export function requireSessionCustomerId(
  request: Request,
): string | NextResponse {
  const fromCookie = customerIdFromSession(request);
  if (fromCookie) return fromCookie;

  const fromHeader = resolveCustomerId(request);
  if (fromHeader) return fromHeader;

  const { useFixture, defaultCustomerId } = getServerConfig();
  if (useFixture) {
    return defaultCustomerId ?? "000000000000000000000000";
  }

  const maya = resolveMayaCustomerId();
  if (maya) return maya;

  return jsonError("Not logged in. POST /api/session/demo first.", 401);
}

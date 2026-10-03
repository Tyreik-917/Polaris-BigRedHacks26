import { jsonError, rateLimit } from "@/lib/api/http";
import { setCustomerSession } from "@/lib/api/session";
import { DEMO_PERSONA } from "@/lib/demo/persona";
import { getServerConfig, isDemoLoginAvailable } from "@/lib/env.server";
import { resolveMayaCustomerId } from "@/lib/seed-ids";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = rateLimit(request, "session-demo", 20, 60_000);
  if (limited) return limited;

  const cfg = getServerConfig();
  const customerId = resolveMayaCustomerId() ?? cfg.defaultCustomerId;

  if (!cfg.useFixture && !isDemoLoginAvailable(cfg) && !customerId) {
    return jsonError(
      "Demo login is not configured. Run scripts/seed-nessie.ts or set NESSIE_CUSTOMER_ID.",
      503,
    );
  }

  const id = customerId ?? "000000000000000000000000";
  const body = {
    customerId: cfg.useFixture ? null : id,
    name: DEMO_PERSONA.fullName,
    fixtureMode: cfg.useFixture,
  };

  const res = NextResponse.json(body);
  if (!cfg.useFixture && customerId) {
    setCustomerSession(res, customerId);
  }
  return res;
}

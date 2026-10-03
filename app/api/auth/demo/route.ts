import { jsonError, rateLimit } from "@/lib/api/http";
import { DEMO_PERSONA } from "@/lib/demo/persona";
import { getServerConfig, isDemoLoginAvailable } from "@/lib/env.server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Issues the server-configured demo Nessie customer (no real auth). */
export async function POST(request: Request) {
  const limited = rateLimit(request, "auth-demo", 20, 60_000);
  if (limited) return limited;

  const cfg = getServerConfig();
  if (!isDemoLoginAvailable(cfg)) {
    return jsonError(
      "Demo login is not configured. Set NESSIE_CUSTOMER_ID or POLARIS_USE_FIXTURE=true.",
      503,
    );
  }

  if (cfg.useFixture) {
    return NextResponse.json({
      fixtureMode: true,
      customerId: null,
      persona: DEMO_PERSONA,
    });
  }

  return NextResponse.json({
    fixtureMode: false,
    customerId: cfg.defaultCustomerId,
    persona: DEMO_PERSONA,
  });
}

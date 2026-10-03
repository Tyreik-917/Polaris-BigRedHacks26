import { getServerConfig, isDemoLoginAvailable } from "@/lib/env.server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Public runtime flags for the client (no secrets). */
export async function GET() {
  const cfg = getServerConfig();
  return NextResponse.json({
    fixtureMode: cfg.useFixture,
    hasServerDefaultCustomer: Boolean(cfg.defaultCustomerId),
    demoLoginAvailable: isDemoLoginAvailable(cfg),
    features: {
      nessie: cfg.useFixture || Boolean(cfg.nessieApiKey),
      grokChat: Boolean(cfg.xaiApiKey),
      grokVoice: Boolean(cfg.xaiApiKey),
      grokImagine: Boolean(cfg.xaiApiKey),
    },
  });
}

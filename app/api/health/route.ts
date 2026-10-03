import { getServerConfig } from "@/lib/env.server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = getServerConfig();
  return NextResponse.json({
    status: "ok",
    services: {
      nessie: cfg.useFixture || Boolean(cfg.nessieApiKey),
      xai: Boolean(cfg.xaiApiKey),
      fixtureMode: cfg.useFixture,
    },
  });
}

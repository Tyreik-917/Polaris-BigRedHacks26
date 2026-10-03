import demoSnapshot from "@/fixtures/demo-snapshot.json";
import { assertNessieConfigured, getServerConfig } from "@/lib/env.server";
import { fetchFullCustomerSnapshot } from "./client";
import { normalizeNessieBundle, type RawNessieBundle } from "./normalize";
import type { FinancialSnapshot } from "./types";

export async function loadFinancialSnapshot(
  cid: string,
): Promise<FinancialSnapshot> {
  const { useFixture, isProduction } = getServerConfig();

  if (useFixture) {
    return {
      ...(demoSnapshot as FinancialSnapshot),
      customerId: cid,
      fetchedAt: new Date().toISOString(),
    };
  }

  assertNessieConfigured();

  try {
    const raw = await fetchFullCustomerSnapshot(cid);
    return normalizeNessieBundle(raw as RawNessieBundle);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Nessie request failed";
    if (process.env.DEMO_MODE === "true") {
      try {
        const { readFileSync, existsSync } = await import("fs");
        const { resolve } = await import("path");
        const cached = resolve(process.cwd(), "data/demo-snapshot.json");
        if (existsSync(cached)) {
          const snap = JSON.parse(readFileSync(cached, "utf8")) as FinancialSnapshot;
          return { ...snap, customerId: cid, fetchedAt: new Date().toISOString() };
        }
      } catch {
        /* fall through */
      }
    }
    if (isProduction) {
      throw new Error(message);
    }
    throw new Error(`${message} (Set POLARIS_USE_FIXTURE=true for offline dev.)`);
  }
}

import { jsonError, rateLimit, requireCustomerId } from "@/lib/api/http";
import { loadFinancialSnapshot } from "@/lib/nessie/load-snapshot";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = rateLimit(request, "sync");
  if (limited) return limited;

  const customerId = requireCustomerId(request);
  if (customerId instanceof NextResponse) return customerId;

  try {
    const snapshot = await loadFinancialSnapshot(customerId);
    return NextResponse.json(snapshot);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return jsonError(message, 502);
  }
}

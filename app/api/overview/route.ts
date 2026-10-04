import { jsonError, rateLimit } from "@/lib/api/http";
import { requireSessionCustomerId } from "@/lib/api/require-customer";
import { loadFinancialSnapshot } from "@/lib/nessie/load-snapshot";
import { buildOverview } from "@/lib/polaris/overview";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = rateLimit(request, "overview");
  if (limited) return limited;

  const customerId = requireSessionCustomerId(request);
  if (customerId instanceof NextResponse) return customerId;

  try {
    const snapshot = await loadFinancialSnapshot(customerId);
    const targetDate =
      request.headers.get("x-polaris-target-date") ??
      "2026-12-10";

    const overview = buildOverview(snapshot, targetDate);
    return NextResponse.json({
      checking: overview.checking,
      savings: overview.savings,
      billsBeforeTarget: overview.billsBeforeTarget,
      weeklyFoodSpend: overview.foodSpending,
      paycheckIntervalLabel: overview.paycheckIntervalLabel,
      paycheckAmount: overview.paycheckAmount,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Overview failed";
    return jsonError(message, 502);
  }
}

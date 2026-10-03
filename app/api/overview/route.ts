import { jsonError, rateLimit } from "@/lib/api/http";
import { requireSessionCustomerId } from "@/lib/api/require-customer";
import { loadFinancialSnapshot } from "@/lib/nessie/load-snapshot";
import { NextResponse } from "next/server";
import { z } from "zod";

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
      new Date(Date.now() + 75 * 86400000).toISOString().slice(0, 10);

    const billsBeforeTarget = snapshot.bills
      .filter((b) => b.dueDate <= targetDate)
      .reduce((s, b) => s + b.amount, 0);

    const payload = {
      checking: snapshot.checkingBalance,
      savings: snapshot.savingsBalance,
      billsBeforeTarget,
      weeklyFoodSpend: snapshot.avgDailyFoodSpend * 7,
    };
    z.object({
      checking: z.number(),
      savings: z.number(),
      billsBeforeTarget: z.number(),
      weeklyFoodSpend: z.number(),
    }).parse(payload);

    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Overview failed";
    return jsonError(message, 502);
  }
}

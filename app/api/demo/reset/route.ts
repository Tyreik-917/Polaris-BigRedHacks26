import { jsonError, rateLimit } from "@/lib/api/http";
import { requireSessionCustomerId } from "@/lib/api/require-customer";
import { demoGuard } from "@/lib/demo/mode";
import { resetCustomerState } from "@/lib/goals/store";
import { resolveMayaCustomerId } from "@/lib/seed-ids";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = demoGuard();
  if (guard) return jsonError(guard.error, guard.status);

  const limited = rateLimit(request, "demo-reset", 5, 60_000);
  if (limited) return limited;

  const customerId = requireSessionCustomerId(request);
  if (customerId instanceof NextResponse) return customerId;

  const mayaId = resolveMayaCustomerId() ?? customerId;
  await resetCustomerState(mayaId);

  return NextResponse.json({
    ok: true,
    message:
      "Cleared goals, seen transactions, and user-reported adjustments. Nessie purchases remain — re-seed with --reset if needed.",
  });
}

import { jsonError, rateLimit } from "@/lib/api/http";
import { demoGuard } from "@/lib/demo/mode";
import { createSamPayment } from "@/lib/demo/sam-payment";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = demoGuard();
  if (guard) return jsonError(guard.error, guard.status);

  const limited = rateLimit(request, "demo-sam-pay", 10, 60_000);
  if (limited) return limited;

  try {
    const transferId = await createSamPayment();
    return NextResponse.json({ ok: true, transferId });
  } catch (e) {
    console.error("[demo] sam-pay failed", e);
    return jsonError("Sam's payment failed. Check Nessie seed data.", 502);
  }
}

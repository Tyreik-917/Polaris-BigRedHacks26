import { jsonError, parseJsonBody, rateLimit } from "@/lib/api/http";
import { demoGuard } from "@/lib/demo/mode";
import { createPurchase, createdId, listMerchants } from "@/lib/nessie";
import { loadSeedIds } from "@/lib/seed-ids";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  merchant: z.string().min(1).max(80),
  amount: z.number().positive(),
});

export async function POST(request: Request) {
  const guard = demoGuard();
  if (guard) return jsonError(guard.error, guard.status);

  const limited = rateLimit(request, "demo-purchase", 10, 60_000);
  if (limited) return limited;

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const seed = loadSeedIds();
  const checkingId = seed?.maya.checkingAccountId;
  if (!checkingId) {
    return jsonError("Missing Maya checking account in seed-ids.json", 503);
  }

  try {
    let merchantId =
      seed.merchants[parsed.data.merchant] ??
      seed.merchants.Chipotle ??
      Object.values(seed.merchants)[0];

    if (!merchantId) {
      const merchants = await listMerchants();
      merchantId = String(merchants[0]?._id ?? "");
    }

    if (!merchantId) {
      return jsonError("No merchant available for demo purchase.", 503);
    }

    const res = await createPurchase(checkingId, {
      merchant_id: merchantId,
      medium: "balance",
      amount: parsed.data.amount,
      description: `${parsed.data.merchant} demo purchase`,
      purchase_date: new Date().toISOString().slice(0, 10),
      status: "completed",
    });

    return NextResponse.json({
      ok: true,
      purchaseId: createdId(res),
    });
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Demo purchase failed",
      502,
    );
  }
}

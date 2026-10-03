import { jsonError, parseJsonBody, rateLimit, requireCustomerId } from "@/lib/api/http";
import { createP2pTransferRequest } from "@/lib/nessie/transfers.server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = rateLimit(request, "transfers-request", 30);
  if (limited) return limited;

  const customerId = requireCustomerId(request);
  if (customerId instanceof NextResponse) return customerId;

  const body = await parseJsonBody<{
    counterpartyName?: string;
    amount?: number;
    note?: string;
  }>(request);
  if (body instanceof NextResponse) return body;

  const counterpartyName = body.counterpartyName?.trim() ?? "";
  const amount = Number(body.amount);
  if (!counterpartyName || counterpartyName.length > 80) {
    return jsonError("Enter who should pay you.");
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000) {
    return jsonError("Enter a valid amount.");
  }

  try {
    const result = await createP2pTransferRequest(customerId, {
      counterpartyName,
      amount: Math.round(amount * 100) / 100,
      note: body.note?.trim(),
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Transfer request failed";
    return jsonError(message, 502);
  }
}

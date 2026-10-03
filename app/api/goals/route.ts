import { jsonError, parseJsonBody, rateLimit } from "@/lib/api/http";
import { requireSessionCustomerId } from "@/lib/api/require-customer";
import {
  addSeenTransactionIds,
  saveGoal,
} from "@/lib/goals/store";
import { loadFinancialSnapshot } from "@/lib/nessie/load-snapshot";
import { buildProjectionForGoal } from "@/lib/polaris/build-projection";
import { generatePostcard } from "@/lib/postcard/generate";
import { loadSeedIds } from "@/lib/seed-ids";
import type { Goal } from "@/lib/types";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  targetAmount: z.number().positive(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "goals-create");
  if (limited) return limited;

  const customerId = requireSessionCustomerId(request);
  if (customerId instanceof NextResponse) return customerId;

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const seed = loadSeedIds();
  const goal: Goal = {
    id: randomUUID(),
    customerId,
    name: parsed.data.name,
    targetAmount: parsed.data.targetAmount,
    targetDate: parsed.data.targetDate,
    savingsAccountId: seed?.maya.savingsAccountId ?? "savings",
    createdAt: new Date().toISOString(),
  };

  await saveGoal(goal);

  const snapshot = await loadFinancialSnapshot(customerId);
  const seenIds = [
    ...snapshot.purchases.map((p) => p.id),
    ...snapshot.transfers.map((t) => `transfer:${t.id}`),
  ].filter(Boolean);
  await addSeenTransactionIds(goal.id, seenIds);

  const { projection } = await buildProjectionForGoal(goal);

  void generatePostcard(goal);

  return NextResponse.json({ goal, projection });
}

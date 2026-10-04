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
import { after, NextResponse } from "next/server";
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

  const nessieSnapshot = await loadFinancialSnapshot(customerId);
  const seenIds = [
    ...nessieSnapshot.purchases.map((p) => p.id),
    ...nessieSnapshot.transfers.map((t) => `transfer:${t.id}`),
  ].filter(Boolean);
  await addSeenTransactionIds(goal.id, seenIds);

  const { projection, snapshot } = await buildProjectionForGoal(goal);
  const { buildOverview } = await import("@/lib/polaris/overview");
  const overview = buildOverview(snapshot, goal.targetDate);

  after(() => generatePostcard(goal));

  const polarisMessage =
    `Destination set. I checked your Capital One accounts, your bills and your paydays. ` +
    `ETA ${projection.eta ? new Date(`${projection.eta}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}, ` +
    `${projection.daysLate > 0 ? `${projection.daysLate} days late` : "on track"} at your current pace. ` +
    `I mapped every bill and payday between now and ${new Date(`${goal.targetDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}. Each one is a star on your route.`;

  return NextResponse.json({ goal, projection, overview, polarisMessage });
}

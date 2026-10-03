import { jsonError, parseJsonBody, rateLimit } from "@/lib/api/http";
import { addReportedSpend, getGoal } from "@/lib/goals/store";
import { buildProjectionForGoal } from "@/lib/polaris/build-projection";
import type { RouteEvent } from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
});

export async function POST(request: Request, { params }: Params) {
  const limited = rateLimit(request, "goal-report");
  if (limited) return limited;

  const { id } = await params;
  const goal = await getGoal(id);
  if (!goal) return jsonError("Goal not found.", 404);

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  try {
    const { projection: before } = await buildProjectionForGoal(goal);
    await addReportedSpend(goal.id, parsed.data.amount);
    const { projection: after } = await buildProjectionForGoal(goal);

    const event: RouteEvent = {
      type: "user_reported",
      description: parsed.data.description,
      amount: parsed.data.amount,
      previousEta: before.eta,
      newEta: after.eta,
    };

    return NextResponse.json({ event, projection: after });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Report failed";
    return jsonError(message, 502);
  }
}

import { jsonError, parseJsonBody, rateLimit } from "@/lib/api/http";
import { getGoal } from "@/lib/goals/store";
import { buildCheckpointDetail } from "@/lib/polaris/checkpoints";
import { buildProjectionForGoal } from "@/lib/polaris/build-projection";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().min(1).max(120),
});

export async function POST(request: Request, { params }: Params) {
  const limited = rateLimit(request, "goal-checkpoint");
  if (limited) return limited;

  const { id } = await params;
  const goal = await getGoal(id);
  if (!goal) return jsonError("Goal not found.", 404);

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const { projection, snapshot } = await buildProjectionForGoal(goal);
  const waypoint = projection.waypoints.find(
    (w) => w.date === parsed.data.date && w.label === parsed.data.label,
  );
  if (!waypoint) {
    return jsonError("Star not found on current route.", 404);
  }

  const detail = buildCheckpointDetail(waypoint, goal, projection, snapshot);
  return NextResponse.json(detail);
}

import { jsonError, rateLimit } from "@/lib/api/http";
import { getGoal } from "@/lib/goals/store";
import { buildProjectionForGoal } from "@/lib/polaris/build-projection";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const limited = rateLimit(request, "goal-projection");
  if (limited) return limited;

  const { id } = await params;
  const goal = await getGoal(id);
  if (!goal) return jsonError("Goal not found.", 404);

  try {
    const { projection } = await buildProjectionForGoal(goal);
    return NextResponse.json(projection);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Projection failed";
    return jsonError(message, 502);
  }
}

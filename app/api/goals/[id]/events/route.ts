import { jsonError, rateLimit } from "@/lib/api/http";
import { getGoal } from "@/lib/goals/store";
import { pollGoalEvents } from "@/lib/events/poll";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const limited = rateLimit(request, "goal-events");
  if (limited) return limited;

  const { id } = await params;
  const goal = await getGoal(id);
  if (!goal) return jsonError("Goal not found.", 404);

  const url = new URL(request.url);
  const since = url.searchParams.get("since");

  try {
    const holder = { previousWaypoints: [] as Awaited<
      ReturnType<typeof pollGoalEvents>
    >["previousWaypoints"] };
    const result = await pollGoalEvents(goal, since, holder);
    return NextResponse.json({
      events: result.events,
      projection: result.projection,
      previousWaypoints: result.previousWaypoints,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Events poll failed";
    return jsonError(message, 502);
  }
}

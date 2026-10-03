import { jsonError, rateLimit } from "@/lib/api/http";
import { getGoal } from "@/lib/goals/store";
import { postcardStatus } from "@/lib/postcard/generate";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const limited = rateLimit(request, "goal-postcard");
  if (limited) return limited;

  const { id } = await params;
  const goal = await getGoal(id);
  if (!goal) return jsonError("Goal not found.", 404);

  const { url, status } = postcardStatus(goal);
  return NextResponse.json({ url, status });
}

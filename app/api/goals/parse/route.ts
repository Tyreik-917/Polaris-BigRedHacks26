import { jsonError, parseJsonBody, rateLimit } from "@/lib/api/http";
import { parseGoalFromText } from "@/lib/grok/parse-goal";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  text: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "goals-parse");
  if (limited) return limited;

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const started = Date.now();
  try {
    const goal = await parseGoalFromText(parsed.data.text);
    console.info(`[grok] goals/parse ${Date.now() - started}ms`);
    if (!goal) {
      return jsonError("Could not parse goal from text.", 422);
    }
    return NextResponse.json({
      name: goal.label,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate,
    });
  } catch {
    const heuristic = await parseGoalFromText(parsed.data.text);
    if (heuristic) {
      return NextResponse.json({
        name: heuristic.label,
        targetAmount: heuristic.targetAmount,
        targetDate: heuristic.targetDate,
      });
    }
    return jsonError("Goal parse unavailable.", 503);
  }
}

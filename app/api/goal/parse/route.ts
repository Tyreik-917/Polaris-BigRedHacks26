import { jsonError, parseJsonBody, rateLimit } from "@/lib/api/http";
import { parseGoalFromText } from "@/lib/grok/parse-goal";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = rateLimit(request, "goal-parse", 40);
  if (limited) return limited;

  const body = await parseJsonBody<{ text?: string }>(request);
  if (body instanceof NextResponse) return body;

  const text = body.text?.trim();
  if (!text || text.length > 2000) {
    return jsonError("text required (max 2000 characters)");
  }

  try {
    const goal = await parseGoalFromText(text);
    if (!goal) {
      return jsonError("Could not parse goal from text");
    }
    return NextResponse.json({ goal });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Parse failed";
    return jsonError(message, 502);
  }
}

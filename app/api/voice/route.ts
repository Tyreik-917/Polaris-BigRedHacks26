import { jsonError, parseJsonBody, rateLimit } from "@/lib/api/http";
import {
  chatFollowUpInstructions,
  createEphemeralToken,
  directionsInstructions,
  goalSettingInstructions,
  nextMoveInstructions,
  reportSpendingInstructions,
  REALTIME_URL,
} from "@/lib/grok/voice-agent";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = rateLimit(request, "voice", 30);
  if (limited) return limited;

  const body = await parseJsonBody<{
    mode?:
      | "set_goal"
      | "read_directions"
      | "read_next_move"
      | "report_spending"
      | "chat";
    narration?: string;
  }>(request);
  if (body instanceof NextResponse) return body;

  const mode = body.mode ?? "set_goal";
  const narration = body.narration?.slice(0, 8000);

  try {
    const token = await createEphemeralToken();
    const instructions =
      mode === "read_next_move" && narration
        ? nextMoveInstructions(narration)
        : mode === "read_directions" && narration
          ? directionsInstructions(narration)
          : mode === "report_spending"
            ? reportSpendingInstructions()
            : mode === "chat"
              ? chatFollowUpInstructions()
              : goalSettingInstructions();

    if (!token) {
      return NextResponse.json({
        configured: false,
        realtimeUrl: REALTIME_URL,
        instructions,
      });
    }

    return NextResponse.json({
      configured: true,
      token,
      realtimeUrl: REALTIME_URL,
      instructions,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Voice session failed";
    return jsonError(message, 502);
  }
}

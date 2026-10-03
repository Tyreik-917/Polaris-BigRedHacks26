import { jsonError, rateLimit } from "@/lib/api/http";
import { createEphemeralToken, REALTIME_URL } from "@/lib/grok/voice-agent";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const POLARIS_VOICE_PROMPT = `You are Polaris, a calm GPS-style guide helping a college student reach a savings goal.
Speak in short sentences, like turn-by-turn directions.
Never invent or calculate numbers: always call a tool and only say numbers it returns.
Give one move at a time. When the ETA gets worse, say "Rerouting" and give the recovery plan.
Never shame spending.`;

export async function POST(request: Request) {
  const limited = rateLimit(request, "voice-token", 30, 60_000);
  if (limited) return limited;

  const started = Date.now();
  try {
    const secret = await createEphemeralToken();
    console.info(`[grok] voice/token ${Date.now() - started}ms`);

    if (!secret) {
      return NextResponse.json({
        clientSecret: null,
        expiresAt: null,
        configured: false,
        realtimeUrl: REALTIME_URL,
        instructions: POLARIS_VOICE_PROMPT,
      });
    }

    const expiresAt = new Date(Date.now() + 600 * 1000).toISOString();
    return NextResponse.json({
      clientSecret: secret,
      expiresAt,
      configured: true,
      realtimeUrl: REALTIME_URL,
      instructions: POLARIS_VOICE_PROMPT,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Token mint failed";
    return jsonError(message, 502);
  }
}

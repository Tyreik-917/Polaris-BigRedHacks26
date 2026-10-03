const XAI_BASE = "https://api.x.ai/v1";

export type VoiceSessionConfig = {
  mode:
    | "set_goal"
    | "read_directions"
    | "read_next_move"
    | "report_spending"
    | "chat";
  instructions: string;
};

export function voiceInstructions(config: VoiceSessionConfig): string {
  return config.instructions;
}

/** Short-lived token for browser WebSocket (xAI Realtime). */
export async function createEphemeralToken(): Promise<string | null> {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;

  const res = await fetch(`${XAI_BASE}/realtime/client_secrets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expires_after: { seconds: 600 },
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    client_secret?: { value?: string; secret?: string };
    value?: string;
  };
  return (
    data.client_secret?.value ??
    data.client_secret?.secret ??
    data.value ??
    null
  );
}

export const REALTIME_URL =
  "wss://api.x.ai/v1/realtime?model=grok-voice-latest";

/** Session payload for browser `session.update` (PCM 24 kHz + input transcription). */
export function realtimeSessionConfig(instructions: string) {
  return {
    voice: "eve",
    instructions,
    turn_detection: { type: "server_vad" as const },
    audio: {
      input: {
        format: { type: "audio/pcm" as const, rate: 24000 },
        transcription: { model: "grok-transcribe" as const },
      },
      output: {
        format: { type: "audio/pcm" as const, rate: 24000 },
      },
    },
  };
}

export function goalSettingInstructions(): string {
  return `You are Polaris, a friendly financial GPS for college students.
Listen for a savings goal with a dollar amount and a deadline date.
Confirm back briefly. Keep responses under 3 sentences when speaking.
When the user states a clear goal, summarize: label, target amount, and date in ISO form YYYY-MM-DD.`;
}

export function directionsInstructions(narration: string): string {
  return `You are Polaris GPS voice. Read these turn-by-turn directions naturally, exactly as written, without changing any dollar amounts or dates:

${narration}`;
}

export function nextMoveInstructions(narration: string): string {
  return `You are Polaris GPS voice. Read this single next-move direction aloud like a car GPS — calm, clear, one breath. Do not add extra advice or change any dollar amounts or dates:

${narration}`;
}

export function reportSpendingInstructions(): string {
  return `You are Polaris, a friendly financial GPS for college students.
Listen for spending the user already did that might not show on their bank feed yet — cash, campus bookstore, same-day purchases.
Confirm back briefly with amount and what they bought. Keep responses under 2 sentences when speaking.
When they state a clear purchase, summarize: dollar amount and a short description (e.g. textbook).`;
}

export function chatFollowUpInstructions(): string {
  return `You are Polaris, a friendly financial GPS for college students.
Listen for a short follow-up question about their savings route, ETA, or spending.
Confirm you heard the question in one brief sentence — the app will answer in text. Do not invent balances or dates.`;
}

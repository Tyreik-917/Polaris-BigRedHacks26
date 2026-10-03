const XAI_BASE = "https://api.x.ai/v1";

export function xaiConfigured(): boolean {
  return Boolean(process.env.XAI_API_KEY);
}

export async function xaiChatCompletion(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
): Promise<string | null> {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;
  const model = process.env.XAI_CHAT_MODEL ?? "grok-3-mini-fast";
  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

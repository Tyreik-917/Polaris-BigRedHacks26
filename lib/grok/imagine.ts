const XAI_BASE = "https://api.x.ai/v1";

export async function generateDestinationImage(
  label: string,
): Promise<string | null> {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;
  const model = process.env.XAI_IMAGINE_MODEL ?? "grok-imagine-image";
  const prompt = `Motivational travel postcard photo, dreamy but realistic: ${label}. Warm lighting, aspirational, no text overlay.`;

  const res = await fetch(`${XAI_BASE}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      aspect_ratio: "4:3",
      response_format: "url",
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { data?: { url?: string }[] };
  return data.data?.[0]?.url ?? null;
}

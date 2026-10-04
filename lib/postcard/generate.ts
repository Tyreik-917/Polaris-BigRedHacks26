import { updateGoal } from "@/lib/goals/store";
import { generateDestinationImage } from "@/lib/grok/imagine";
import { xaiChatCompletion } from "@/lib/grok/client";
import type { Goal } from "@/lib/types";

const FALLBACK = "/postcards/maya-flight-home.png";
const TIMEOUT_MS = 20_000;

async function destinationFromGoalName(name: string): Promise<string> {
  const raw = await xaiChatCompletion([
    {
      role: "system",
      content:
        "Extract a travel destination phrase from a savings goal name. Reply with one short place description only.",
    },
    { role: "user", content: name },
  ]);
  return raw?.trim() || "a cozy hometown street at dusk";
}

export async function generatePostcard(goal: Goal): Promise<void> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const destination = await destinationFromGoalName(goal.name);
    const prompt = `A vintage travel postcard of ${destination}, night sky with a bright North Star, warm gold and deep navy palette, no text.`;
    const url = await Promise.race([
      generateDestinationImage(prompt),
      new Promise<null>((resolve) => {
        timer = setTimeout(
          () => resolve(null),
          Math.max(0, TIMEOUT_MS - (Date.now() - started)),
        );
      }),
    ]);
    await updateGoal(goal.id, {
      postcardUrl: url ?? FALLBACK,
    });
  } catch {
    await updateGoal(goal.id, { postcardUrl: FALLBACK });
  } finally {
    clearTimeout(timer);
  }
}

export function postcardStatus(goal: Goal | null): {
  url: string | null;
  status: "pending" | "ready" | "fallback";
} {
  if (!goal) return { url: null, status: "pending" };
  if (!goal.postcardUrl) return { url: null, status: "pending" };
  if (goal.postcardUrl.includes("/postcards/")) {
    return { url: goal.postcardUrl, status: "fallback" };
  }
  return { url: goal.postcardUrl, status: "ready" };
}

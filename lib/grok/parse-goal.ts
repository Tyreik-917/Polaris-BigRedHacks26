import { parseGoalInput, type Goal } from "@/lib/goals/types";
import { xaiChatCompletion } from "./client";

export async function parseGoalFromText(text: string): Promise<Goal | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const heuristic = parseGoalFromHeuristic(trimmed);
  if (heuristic) return heuristic;

  const raw = await xaiChatCompletion([
    {
      role: "system",
      content:
        'Extract a savings goal. Reply ONLY with JSON: {"label":"","targetAmount":0,"targetDate":"YYYY-MM-DD"}. Use today context: college student savings goal.',
    },
    { role: "user", content: trimmed },
  ]);

  if (!raw) return null;
  try {
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
      label?: string;
      targetAmount?: number;
      targetDate?: string;
    };
    return parseGoalInput(json);
  } catch {
    return null;
  }
}

function parseGoalFromHeuristic(text: string): Goal | null {
  const amountMatch = text.match(/\$?\s*(\d+(?:\.\d{2})?)/);
  const dateMatch = text.match(
    /(\d{4}-\d{2}-\d{2})|((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?)/i,
  );
  if (!amountMatch) return null;
  let targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + 2);
  if (dateMatch?.[1]) {
    targetDate = new Date(dateMatch[1]);
  } else if (dateMatch?.[0]) {
    const parsed = Date.parse(dateMatch[0]);
    if (!Number.isNaN(parsed)) targetDate = new Date(parsed);
  }
  return parseGoalInput({
    label: text.slice(0, 80),
    targetAmount: Number(amountMatch[1]),
    targetDate: targetDate.toISOString().slice(0, 10),
  });
}

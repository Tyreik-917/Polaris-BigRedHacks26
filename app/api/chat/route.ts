import type { ChatMessage } from "@/lib/chat/types";
import { jsonError, parseJsonBody, rateLimit, requireCustomerId } from "@/lib/api/http";
import { answerPolarisQuestion } from "@/lib/grok/chat-follow-up";
import { parseGoalInput } from "@/lib/goals/types";
import { loadFinancialSnapshot } from "@/lib/nessie/load-snapshot";
import { projectGoal } from "@/lib/projection/engine";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_HISTORY = 10;
const MAX_DIRECTION_LINES = 20;

export async function POST(request: Request) {
  const limited = rateLimit(request, "chat", 40);
  if (limited) return limited;

  const customerId = requireCustomerId(request);
  if (customerId instanceof NextResponse) return customerId;

  const body = await parseJsonBody<{
    question?: string;
    goal?: unknown;
    directionLines?: string[];
    history?: ChatMessage[];
  }>(request);
  if (body instanceof NextResponse) return body;

  const question = body.question?.trim();
  if (!question || question.length > 2000) {
    return jsonError("question required (max 2000 characters)");
  }

  const goal = parseGoalInput(
    (body.goal ?? {}) as Parameters<typeof parseGoalInput>[0],
  );
  if (!goal) {
    return jsonError("Invalid goal.");
  }

  try {
    // Always load balances server-side: the model must only cite real numbers.
    const snapshot = await loadFinancialSnapshot(customerId);
    const projection = projectGoal(goal, snapshot);
    const directionLines = Array.isArray(body.directionLines)
      ? body.directionLines
          .filter((l): l is string => typeof l === "string")
          .slice(0, MAX_DIRECTION_LINES)
          .map((l) => l.slice(0, 300))
      : [];
    const history = Array.isArray(body.history)
      ? body.history
          .filter(
            (m): m is ChatMessage =>
              Boolean(m) &&
              typeof m === "object" &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string",
          )
          .slice(-MAX_HISTORY)
          .map((m) => ({ ...m, content: m.content.slice(0, 2000) }))
      : [];

    const reply = await answerPolarisQuestion(
      {
        goal,
        projection,
        snapshot,
        directionLines,
        history,
      },
      question,
    );

    return NextResponse.json({ reply });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    return jsonError(message, 502);
  }
}

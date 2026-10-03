import type { ChatMessage } from "@/lib/chat/types";
import { jsonError, parseJsonBody, rateLimit, requireCustomerId } from "@/lib/api/http";
import { answerPolarisQuestion } from "@/lib/grok/chat-follow-up";
import { parseGoalInput } from "@/lib/goals/types";
import { loadFinancialSnapshot } from "@/lib/nessie/load-snapshot";
import type { FinancialSnapshot } from "@/lib/nessie/types";
import { projectGoal } from "@/lib/projection/engine";
import type { ProjectionResult } from "@/lib/projection/engine";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = rateLimit(request, "chat", 40);
  if (limited) return limited;

  const customerId = requireCustomerId(request);
  if (customerId instanceof NextResponse) return customerId;

  const body = await parseJsonBody<{
    question?: string;
    goal?: unknown;
    snapshot?: FinancialSnapshot;
    projection?: ProjectionResult;
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
    const snapshot =
      body.snapshot ?? (await loadFinancialSnapshot(customerId));
    const projection =
      body.projection ?? projectGoal(goal, snapshot);
    const directionLines = Array.isArray(body.directionLines)
      ? body.directionLines.filter((l): l is string => typeof l === "string")
      : [];
    const history = Array.isArray(body.history) ? body.history : [];

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

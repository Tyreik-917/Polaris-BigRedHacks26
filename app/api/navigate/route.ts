import { buildTips } from "@/lib/advice/rules";
import { jsonError, parseJsonBody, rateLimit, requireCustomerId } from "@/lib/api/http";
import { parseGoalInput } from "@/lib/goals/types";
import { generateDirections } from "@/lib/grok/directions";
import { loadFinancialSnapshot } from "@/lib/nessie/load-snapshot";
import type { FinancialSnapshot } from "@/lib/nessie/types";
import { projectGoal } from "@/lib/projection/engine";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = rateLimit(request, "navigate");
  if (limited) return limited;

  const customerId = requireCustomerId(request);
  if (customerId instanceof NextResponse) return customerId;

  const body = await parseJsonBody<{
    goal?: unknown;
    snapshot?: FinancialSnapshot;
  }>(request);
  if (body instanceof NextResponse) return body;

  const goal = parseGoalInput(
    (body.goal ?? {}) as Parameters<typeof parseGoalInput>[0],
  );
  if (!goal) {
    return jsonError("Invalid goal.");
  }

  try {
    const snapshot =
      body.snapshot ?? (await loadFinancialSnapshot(customerId));
    const projection = projectGoal(goal, snapshot);
    const tips = buildTips(goal, snapshot, projection);
    const { narration, lines } = await generateDirections(
      goal,
      projection,
      tips,
    );
    return NextResponse.json({
      tips,
      narration,
      lines,
      projection,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Navigate failed";
    return jsonError(message, 502);
  }
}

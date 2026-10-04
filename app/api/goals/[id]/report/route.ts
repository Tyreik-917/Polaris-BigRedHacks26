import { jsonError, parseJsonBody, rateLimit } from "@/lib/api/http";
import { addReportedSpend, getGoal } from "@/lib/goals/store";
import { parseSpendingReportFromText } from "@/lib/grok/parse-spending-report";
import { buildProjectionForGoal } from "@/lib/polaris/build-projection";
import type { RouteEvent } from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const structuredSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive().max(50_000),
});

const textSchema = z.object({
  text: z.string().min(1).max(2000),
});

async function readReport(
  body: unknown,
): Promise<{ description: string; amount: number } | null> {
  const structured = structuredSchema.safeParse(body);
  if (structured.success) return structured.data;

  const text = textSchema.safeParse(body);
  if (!text.success) return null;
  const report = await parseSpendingReportFromText(text.data.text);
  return report
    ? { description: report.description, amount: report.amount }
    : null;
}

export async function POST(request: Request, { params }: Params) {
  const limited = rateLimit(request, "goal-report");
  if (limited) return limited;

  const { id } = await params;
  const goal = await getGoal(id);
  if (!goal) return jsonError("Goal not found.", 404);

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;

  try {
    const report = await readReport(body);
    if (!report) {
      return jsonError(
        'Tell me what you spent, with an amount — e.g. "$30 on a textbook".',
        422,
      );
    }

    const { projection: before } = await buildProjectionForGoal(goal);
    await addReportedSpend(goal.id, report.amount);
    const { projection: after } = await buildProjectionForGoal(goal);

    const event: RouteEvent = {
      type: "user_reported",
      description: report.description,
      amount: report.amount,
      previousEta: before.eta,
      newEta: after.eta,
    };

    return NextResponse.json({ event, projection: after });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Report failed";
    return jsonError(message, 502);
  }
}

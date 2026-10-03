import { jsonError, parseJsonBody, rateLimit } from "@/lib/api/http";
import { requireSessionCustomerId } from "@/lib/api/require-customer";
import { runVoiceTool } from "@/lib/voice/tools";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().min(1),
  args: z.record(z.string(), z.unknown()).default({}),
  goalId: z.string().optional(),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "voice-tool", 60, 60_000);
  if (limited) return limited;

  const customerId = requireSessionCustomerId(request);
  if (customerId instanceof NextResponse) return customerId;

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const started = Date.now();
  const result = await runVoiceTool(
    customerId,
    parsed.data.name,
    parsed.data.args,
    parsed.data.goalId,
  );
  console.info(
    `[voice/tool] ${parsed.data.name} ${Date.now() - started}ms`,
  );

  return NextResponse.json(result);
}

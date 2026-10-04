import { jsonError, parseJsonBody, rateLimit } from "@/lib/api/http";
import { destinationChat } from "@/lib/grok/destination-chat";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1000),
      }),
    )
    .min(1)
    .max(30)
    .refine((m) => m[m.length - 1]?.role === "user", "last message must be from the user"),
});

/** Destination-setting conversation: Polaris asks follow-ups until the goal is complete. */
export async function POST(request: Request) {
  const limited = rateLimit(request, "goals-chat", 40);
  if (limited) return limited;

  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid conversation.", 400);

  const started = Date.now();
  const result = await destinationChat(parsed.data.messages);
  console.info(`[grok] goals/chat ${Date.now() - started}ms`);
  return NextResponse.json(result);
}

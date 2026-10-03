import { jsonError, parseJsonBody, rateLimit } from "@/lib/api/http";
import { generateDestinationImage } from "@/lib/grok/imagine";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = rateLimit(request, "imagine", 20);
  if (limited) return limited;

  const body = await parseJsonBody<{ label?: string }>(request);
  if (body instanceof NextResponse) return body;

  const label = body.label?.trim();
  if (!label || label.length > 500) {
    return jsonError("label required (max 500 characters)");
  }

  try {
    const url = await generateDestinationImage(label);
    if (!url) {
      return NextResponse.json({
        url: null,
        placeholder: true,
      });
    }
    return NextResponse.json({ url, placeholder: false });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Imagine failed";
    return jsonError(message, 502);
  }
}

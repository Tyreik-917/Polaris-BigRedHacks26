import { NextResponse } from "next/server";

export const SESSION_COOKIE = "polaris_customer_id";

export function setCustomerSession(
  response: NextResponse,
  customerId: string,
): NextResponse {
  response.cookies.set(SESSION_COOKIE, customerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export function customerIdFromSession(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(
    new RegExp(`${SESSION_COOKIE}=([^;]+)`),
  );
  return match?.[1]?.trim() ?? null;
}

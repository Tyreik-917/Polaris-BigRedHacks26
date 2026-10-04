import { timingSafeEqual } from "crypto";

/** Hackathon demo account. Override with DEMO_LOGIN_EMAIL / DEMO_LOGIN_PASSWORD. */
const DEFAULT_EMAIL = "tyreikr11@cornell.edu";
const DEFAULT_PASSWORD = "123456789";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isDemoCredentials(email: unknown, password: unknown): boolean {
  if (typeof email !== "string" || typeof password !== "string") return false;
  const expectedEmail = (process.env.DEMO_LOGIN_EMAIL?.trim() || DEFAULT_EMAIL).toLowerCase();
  const expectedPassword = process.env.DEMO_LOGIN_PASSWORD || DEFAULT_PASSWORD;
  // Evaluate both so a wrong email and a wrong password take the same time.
  const emailOk = safeEqual(email.trim().toLowerCase(), expectedEmail);
  const passwordOk = safeEqual(password, expectedPassword);
  return emailOk && passwordOk;
}

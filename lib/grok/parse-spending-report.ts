import {
  createUserReportedSpend,
  type UserReportedSpend,
} from "@/lib/user-reports/types";
import { xaiChatCompletion } from "./client";

export async function parseSpendingReportFromText(
  text: string,
  ref: Date = new Date(),
): Promise<UserReportedSpend | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const heuristic = parseSpendingReportHeuristic(trimmed, ref);
  if (heuristic) return heuristic;

  const raw = await xaiChatCompletion([
    {
      role: "system",
      content:
        'Extract a single purchase the user already made that may not be on their bank feed yet. Reply ONLY with JSON: {"amount":0,"description":"","date":"YYYY-MM-DD"}. Use "today" as the date when they say today. Description should be short (e.g. "textbook").',
    },
    { role: "user", content: trimmed },
  ]);

  if (!raw) return null;
  try {
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
      amount?: number;
      description?: string;
      date?: string;
    };
    const amount = Number(json.amount);
    const description = String(json.description ?? "").trim();
    if (!Number.isFinite(amount) || amount <= 0 || !description) return null;
    return createUserReportedSpend({
      amount,
      description,
      date: json.date,
    });
  } catch {
    return null;
  }
}

export function parseSpendingReportHeuristic(
  text: string,
  ref: Date = new Date(),
): UserReportedSpend | null {
  const amountMatch =
    text.match(/\$\s*(\d+(?:\.\d{2})?)/) ??
    text.match(/(\d+(?:\.\d{2})?)\s*(?:dollars?|bucks?)/i);
  if (!amountMatch) return null;

  const amount = Number(amountMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  let date = ref.toISOString().slice(0, 10);
  if (/\byesterday\b/i.test(text)) {
    const d = new Date(ref);
    d.setDate(d.getDate() - 1);
    date = d.toISOString().slice(0, 10);
  } else if (/\btoday\b/i.test(text)) {
    date = ref.toISOString().slice(0, 10);
  } else {
    const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (iso?.[1]) date = iso[1];
  }

  const description = inferDescription(text, amount);
  if (!description) return null;

  return createUserReportedSpend({ amount, description, date });
}

function inferDescription(text: string, amount: number): string {
  const withoutAmount = text
    .replace(/\$\s*\d+(?:\.\d{2})?/g, " ")
    .replace(/\b\d+(?:\.\d{2})?\s*(?:dollars?|bucks?)\b/gi, " ")
    .replace(
      /\b(also|had to|buy|bought|spent|pay|paid|pick up|got|just|today|yesterday|an|a|the|for|on|my|i)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  if (withoutAmount.length >= 2) {
    return withoutAmount.slice(0, 120);
  }

  const noun = text.match(
    /\b(?:buy|bought|for|on)\s+(?:an?\s+)?([a-z][a-z\s'-]{2,40})/i,
  );
  if (noun?.[1]) {
    return noun[1].trim().slice(0, 120);
  }

  return `Purchase ($${amount})`.slice(0, 120);
}

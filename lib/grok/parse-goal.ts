import { parseGoalInput, type Goal } from "@/lib/goals/types";
import { xaiChatCompletion } from "./client";

export async function parseGoalFromText(text: string): Promise<Goal | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const heuristic = parseGoalFromHeuristic(trimmed);
  if (heuristic) return heuristic;

  const raw = await xaiChatCompletion([
    {
      role: "system",
      content:
        'Extract a savings goal. Reply ONLY with JSON: {"label":"","targetAmount":0,"targetDate":"YYYY-MM-DD"}. Use today context: college student savings goal.',
    },
    { role: "user", content: trimmed },
  ]);

  if (!raw) return null;
  try {
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
      label?: string;
      targetAmount?: number;
      targetDate?: string;
    };
    return parseGoalInput(json);
  } catch {
    return null;
  }
}

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function isoDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** "Dec 15" with no year means the next Dec 15, not 2001 (what Date.parse picks). */
export function parseTargetDate(text: string, ref: Date = new Date()): string | null {
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];

  const named = text.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i,
  );
  if (!named) return null;
  const month = MONTHS.indexOf(named[1].toLowerCase());
  const day = Number(named[2]);
  let year = named[3] ? Number(named[3]) : ref.getFullYear();
  let d = new Date(year, month, day);
  if (!named[3] && d < new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())) {
    year += 1;
    d = new Date(year, month, day);
  }
  return d.getMonth() === month ? isoDate(d) : null;
}

/** "Save $400 for a flight home by Dec 15" → "Flight home". */
function goalLabel(text: string): string {
  const phrase = text.match(
    /\b(?:for|towards?)\s+(?:an?\s+|the\s+|my\s+)?(.+?)(?:\s+(?:by|before|in|within|until)\b|[.!?]|$)/i,
  )?.[1];
  const label = (phrase ?? text).trim().slice(0, 80);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Dollar amount in free text ("$1,200", "400 bucks", "save 400"), or null. */
export function extractGoalAmount(text: string): number | null {
  const m =
    text.match(/\$\s*(\d[\d,]*(?:\.\d{2})?)/) ??
    text.match(/\b(\d[\d,]*(?:\.\d{2})?)\s*(?:dollars?|bucks?)\b/i) ??
    text.match(/\b(?:save|saving|need|raise|put away)\s+(\d[\d,]*(?:\.\d{2})?)\b/i) ??
    // A bare number reply ("400") to "how much?"
    text.match(/^\s*(\d[\d,]*(?:\.\d{2})?)\s*$/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Goal name from a "for …" phrase, or null when the text doesn't name one. */
export function extractGoalName(text: string): string | null {
  const phrase = text.match(
    /\b(?:for|towards?)\s+(?:an?\s+|the\s+|my\s+)?(.+?)(?:\s+(?:by|before|in|within|until)\b|[.!?]|$)/i,
  )?.[1];
  if (!phrase) return null;
  const name = phrase.trim().slice(0, 80);
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : null;
}

export function parseGoalFromHeuristic(
  text: string,
  ref: Date = new Date(),
): Goal | null {
  const amountMatch =
    text.match(/\$\s*(\d[\d,]*(?:\.\d{2})?)/) ??
    text.match(/\b(\d[\d,]*(?:\.\d{2})?)\s*(?:dollars?|bucks?)\b/i) ??
    text.match(/\b(?:save|saving|need|raise|put away)\s+(\d[\d,]*(?:\.\d{2})?)\b/i);
  if (!amountMatch) return null;

  const fallback = new Date(ref);
  fallback.setMonth(fallback.getMonth() + 2);

  return parseGoalInput({
    label: goalLabel(text),
    targetAmount: Number(amountMatch[1].replace(/,/g, "")),
    targetDate: parseTargetDate(text, ref) ?? isoDate(fallback),
  });
}

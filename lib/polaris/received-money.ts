/**
 * "I received money" detection shared by the live chat route and fixture mode.
 * Pure and client-safe: no network, no server-only imports.
 */

export type ReceivedMoney = {
  amount: number;
  /** Category used in replies, e.g. "Extra shift" or "Money from someone". */
  description: string;
  /** Short star label for the route map, e.g. "Tips" or "From Mom". */
  label: string;
};

/** Money coming in, checked before spend verbs ("got paid", "got $200 from my mom"). */
export const INCOME_CUES: [RegExp, string][] = [
  [/\b(got paid|get paid|paycheck|payday|direct deposit)\b/i, "Paycheck"],
  [/\b(extra shift|overtime|tips?)\b/i, "Extra shift"],
  [
    /\b(sent me|gave me|venmo'?d me|zelle'?d me|paid me back|paid me|from my (mom|dad|parents|family|grandma|grandpa))\b/i,
    "Money from someone",
  ],
  [/\b(refund(ed)?|reimburs\w*|got .{0,20}back)\b/i, "Refund"],
  [/\b(sold)\b/i, "Sale"],
  [/\b(earned|made|received|bonus|scholarship|stipend)\b/i, "Income"],
];

export function amountIn(text: string): number | null {
  const m =
    text.match(/\$\s*(\d[\d,]*(?:\.\d{1,2})?)/) ??
    text.match(/\b(\d[\d,]*(?:\.\d{1,2})?)\s*(?:dollars?|bucks?)\b/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 && n <= 50_000 ? n : null;
}

const QUESTION =
  /\?\s*$|^(can|could|should|what|what's|whats|how|when|why|where|am|is|are|will|would|do|does|did|if|which|tell me|help)\b/i;

/** Words that never make sense as a person's name in "from X" / "X paid me". */
const NOT_A_NAME =
  /^(work|my|the|a|an|job|campus|tips?|shift|selling|tutoring|babysitting)$/i;

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Who or what the money came from, as a short star label.
 * "Sam venmo'd me $20" → "From Sam"; "$50 from my mom" → "From Mom".
 */
export function receivedMoneyLabel(text: string, description: string): string {
  if (/\btips?\b/i.test(text)) return "Tips";
  if (/\b(extra shift|overtime)\b/i.test(text)) return "Extra shift";
  if (/\bscholarship\b/i.test(text)) return "Scholarship";
  if (/\bstipend\b/i.test(text)) return "Stipend";
  if (/\bbonus\b/i.test(text)) return "Bonus";
  if (/\brefund|reimburs/i.test(text)) return "Refund";
  if (/\bsold\b/i.test(text)) return "Sale";

  const fromFamily =
    text.match(
      /\bfrom my (mom|dad|parents|family|grandma|grandpa|aunt|uncle|brother|sister)\b/i,
    ) ??
    text.match(
      /\bmy (mom|dad|parents|grandma|grandpa|aunt|uncle|brother|sister)\s+(?:sent|gave|venmo'?d|zelle'?d|paid)\b/i,
    );
  if (fromFamily) return `From ${titleCase(fromFamily[1])}`;

  const sender =
    text.match(
      /\b([A-Z][a-z]{1,15})\s+(?:sent|gave|venmo'?d|zelle'?d|paid)\s+me\b/,
    )?.[1] ?? text.match(/\bfrom\s+([A-Z][a-z]{1,15})\b/)?.[1];
  if (sender && !NOT_A_NAME.test(sender)) return `From ${sender}`;

  if (/\b(got paid|paycheck|payday|direct deposit)\b/i.test(text)) {
    return "Paycheck";
  }
  return description === "Income" ? "Money in" : description.slice(0, 18);
}

/** Message reports money the user already received → amount + labels, else null. */
export function parseReceivedMoney(text: string): ReceivedMoney | null {
  const trimmed = text.trim();
  if (QUESTION.test(trimmed)) return null;
  const amount = amountIn(trimmed);
  if (amount == null) return null;
  const cue = INCOME_CUES.find(([re]) => re.test(trimmed));
  if (!cue) return null;
  return {
    amount,
    description: cue[1],
    label: receivedMoneyLabel(trimmed, cue[1]),
  };
}

/**
 * Demo calibration: the storyboard's $85 of tips moves the ETA 9 days sooner,
 * so every dollar received counts the same.
 */
export function demoDaysSoonerForIncome(totalReceived: number): number {
  return Math.max(0, Math.round((totalReceived * 9) / 85));
}

/** Local calendar date (YYYY-MM-DD) — the day the user is living in. */
export function localIsoDate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ---------- Money someone will send on a future date ---------- */

export type ExpectedMoney = {
  amount: number;
  /** Star label, e.g. "From Sam". */
  label: string;
  /** Who is sending, for replies ("Sam", "your mom", "your friend"). */
  sender: string;
  /** YYYY-MM-DD, or null when the user didn't say when. */
  date: string | null;
};

/** "Sam is sending me…", "my friend will pay me back…", "I'm getting $20 from Jo…" */
const FUTURE_MONEY =
  /\b(is|are|'s|will|gonna|going to)\s+(?:be\s+)?(send|sending|pay|paying|venmo|venmoing|zelle|transfer|transferring|give|giving)\b|\b(sending|paying)\s+me\b|\b(expecting|getting|receiving|will get|will receive|i'll get|i'll receive)\b[^.?!]{0,40}\bfrom\b/i;

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];
const WEEKDAYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

function isoFrom(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null; // e.g. Feb 30
  }
  return dt.toISOString().slice(0, 10);
}

function addDaysIso(iso: string, n: number): string {
  const dt = new Date(`${iso}T12:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** Month/day without a year means the next time that date comes around. */
function nextOccurrence(m: number, d: number, today: string): string | null {
  const year = Number(today.slice(0, 4));
  const thisYear = isoFrom(year, m, d);
  if (thisYear && thisYear >= today) return thisYear;
  return isoFrom(year + 1, m, d);
}

function monthIndex(word: string): number {
  return MONTHS.indexOf(word.slice(0, 3).toLowerCase()) + 1;
}

/**
 * A calendar date mentioned in a message, as YYYY-MM-DD.
 * Handles 2026-10-15, 10/15(/26), Oct 15(th)(, 2026), 15th of October,
 * "the 15th", tomorrow, and weekday names ("on Friday", "next Friday").
 */
export function parseMentionedDate(text: string, today: string): string | null {
  let m = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) return isoFrom(Number(m[1]), Number(m[2]), Number(m[3]));

  m = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?\b/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    if (!m[3]) return nextOccurrence(month, day, today);
    const y = Number(m[3]);
    return isoFrom(y < 100 ? 2000 + y : y, month, day);
  }

  const monthWord =
    "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  m = text.match(
    new RegExp(`\\b${monthWord}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, "i"),
  );
  if (m) {
    const month = monthIndex(m[1]);
    const day = Number(m[2]);
    return m[3] ? isoFrom(Number(m[3]), month, day) : nextOccurrence(month, day, today);
  }
  m = text.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${monthWord}(?:,?\\s+(\\d{4}))?\\b`, "i"),
  );
  if (m) {
    const month = monthIndex(m[2]);
    const day = Number(m[1]);
    return m[3] ? isoFrom(Number(m[3]), month, day) : nextOccurrence(month, day, today);
  }

  m = text.match(/\bthe\s+(\d{1,2})(?:st|nd|rd|th)\b/i);
  if (m) {
    const day = Number(m[1]);
    const [y, mo] = today.split("-").map(Number);
    const thisMonth = isoFrom(y, mo, day);
    if (thisMonth && thisMonth >= today) return thisMonth;
    return mo === 12 ? isoFrom(y + 1, 1, day) : isoFrom(y, mo + 1, day);
  }

  if (/\btomorrow\b/i.test(text)) return addDaysIso(today, 1);
  if (/\btoday\b|\btonight\b/i.test(text)) return today;

  m = text.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  if (m) {
    const target = WEEKDAYS.indexOf(m[2].toLowerCase());
    const current = new Date(`${today}T12:00:00Z`).getUTCDay();
    let ahead = (target - current + 7) % 7 || 7;
    if (m[1] && ahead < 7) ahead += 7;
    return addDaysIso(today, ahead);
  }

  return null;
}

function expectedSender(text: string): { label: string; sender: string } {
  const family = text.match(
    /\bmy (mom|dad|parents|grandma|grandpa|aunt|uncle|brother|sister)\b/i,
  );
  if (family) {
    const who = family[1].toLowerCase();
    return { label: `From ${titleCase(who)}`, sender: `your ${who}` };
  }
  const name =
    text.match(/\bmy (?:friend|roommate|buddy|bestie|best friend|coworker|boss)\s+([A-Z][a-z]{1,15})\b/)?.[1] ??
    text.match(/\b([A-Z][a-z]{1,15})\s+(?:is|are|will|'s|is going to|gonna)\b/)?.[1] ??
    text.match(/\bfrom\s+(?:my\s+\w+\s+)?([A-Z][a-z]{1,15})\b/)?.[1];
  if (name && !NOT_A_NAME.test(name) && !/^(I|My|He|She|They)$/.test(name)) {
    return { label: `From ${name}`, sender: name };
  }
  const role = text.match(/\bmy (friend|roommate|buddy|coworker|boss)\b/i)?.[1];
  if (role) return { label: `From ${role.toLowerCase()}`, sender: `your ${role.toLowerCase()}` };
  return { label: "Money coming", sender: "they" };
}

/**
 * Message says someone WILL send money (not already received) → amount, who,
 * and the date if given. `today` is the user's local YYYY-MM-DD.
 */
export function parseExpectedMoney(text: string, today: string): ExpectedMoney | null {
  const trimmed = text.trim();
  if (QUESTION.test(trimmed)) return null;
  if (!FUTURE_MONEY.test(trimmed)) return null;
  const amount = amountIn(trimmed);
  if (amount == null) return null;
  const { label, sender } = expectedSender(trimmed);
  const date = parseMentionedDate(trimmed, today);
  // A date in the past isn't "coming"; treat it as unknown so Polaris asks.
  return { amount, label, sender, date: date && date >= today ? date : null };
}

/** "Oct 15", or "Jan 3, 2027" when the year isn't the current one. */
export function formatMonDayYear(iso: string, today: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const label = `${MONTHS[m - 1].charAt(0).toUpperCase()}${MONTHS[m - 1].slice(1)} ${d}`;
  return y === Number(today.slice(0, 4)) ? label : `${label}, ${y}`;
}

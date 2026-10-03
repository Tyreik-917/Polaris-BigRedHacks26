export type UserReportedSpend = {
  id: string;
  amount: number;
  description: string;
  /** Calendar date of the spend (YYYY-MM-DD). */
  date: string;
  reportedAt: string;
};

export function parseUserReportedSpendInput(
  raw: unknown,
): UserReportedSpend | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const amount = Number(o.amount);
  const description = String(o.description ?? "").trim().slice(0, 120);
  const date = String(o.date ?? "").slice(0, 10);
  const id = String(o.id ?? "").trim();
  const reportedAt = String(o.reportedAt ?? "").trim();
  if (
    !id ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 50_000 ||
    !description
  ) {
    return null;
  }
  return {
    id,
    amount: Math.round(amount * 100) / 100,
    description,
    date,
    reportedAt: reportedAt || new Date().toISOString(),
  };
}

export function createUserReportedSpend(input: {
  amount: number;
  description: string;
  date?: string;
}): UserReportedSpend {
  const now = new Date();
  const date =
    input.date?.slice(0, 10) ??
    now.toISOString().slice(0, 10);
  return {
    id: `ur-${now.getTime()}-${Math.random().toString(36).slice(2, 9)}`,
    amount: Math.round(input.amount * 100) / 100,
    description: input.description.trim().slice(0, 120),
    date,
    reportedAt: now.toISOString(),
  };
}

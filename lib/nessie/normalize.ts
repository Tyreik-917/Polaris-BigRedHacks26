import {
  averageDailyFoodSpend,
  averageDailySpend,
} from "@/lib/projection/spending";
import type {
  FinancialSnapshot,
  NormalizedBill,
  NormalizedDeposit,
  NormalizedPurchase,
  NormalizedTransfer,
  ReceivableHint,
} from "./types";

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(raw: unknown): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const s = String(raw);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? new Date().toISOString().slice(0, 10)
    : d.toISOString().slice(0, 10);
}

function normalizeBill(raw: Record<string, unknown>): NormalizedBill {
  return {
    id: str(raw._id),
    payee: str(raw.payee ?? raw.description ?? "Bill"),
    amount: num(raw.amount ?? raw.payment_amount),
    dueDate: parseDate(raw.payment_date ?? raw.due_date ?? raw.date),
    status: raw.status ? str(raw.status) : undefined,
    recurring: Boolean(raw.recurring_date ?? raw.recurring),
  };
}

function normalizePurchase(raw: Record<string, unknown>): NormalizedPurchase {
  const merchant = raw.merchant_id as Record<string, unknown> | undefined;
  return {
    id: str(raw._id),
    amount: num(raw.amount ?? raw.purchase_amount),
    date: parseDate(raw.purchase_date ?? raw.date),
    description: str(raw.description ?? raw.memo ?? "Purchase"),
    merchantName: merchant ? str(merchant.name) : str(raw.merchant_name),
    category: merchant ? str(merchant.category) : str(raw.category),
  };
}

function normalizeDeposit(raw: Record<string, unknown>): NormalizedDeposit {
  return {
    id: str(raw._id),
    amount: num(raw.amount ?? raw.deposit_amount),
    date: parseDate(raw.deposit_date ?? raw.date),
    description: str(raw.description ?? raw.memo),
  };
}

function normalizeTransfer(raw: Record<string, unknown>): NormalizedTransfer {
  const amount = num(raw.amount ?? raw.transfer_amount);
  const desc = str(raw.description ?? raw.memo ?? "Transfer");
  const payer = str(raw.payer_id ?? raw.from);
  const payee = str(raw.payee_id ?? raw.to);
  const direction: "in" | "out" = amount >= 0 ? "in" : "out";
  return {
    id: str(raw._id),
    amount: Math.abs(amount),
    date: parseDate(raw.transaction_date ?? raw.date),
    description: desc,
    direction,
    counterparty: payee || payer || undefined,
  };
}

function detectReceivables(transfers: NormalizedTransfer[]): ReceivableHint[] {
  const hints: ReceivableHint[] = [];
  for (const t of transfers) {
    if (
      t.direction === "in" &&
      /owe|split|venmo|payback|reimburse/i.test(t.description)
    ) {
      hints.push({
        name: t.counterparty ?? "Friend",
        amount: t.amount,
        note: t.description,
      });
    }
  }
  const owedOut = transfers.filter(
    (t) =>
      t.direction === "out" &&
      /lent|cover|fronted|owe me|waiting on/i.test(t.description),
  );
  for (const t of owedOut) {
    hints.push({
      name: t.counterparty ?? "Friend",
      amount: t.amount,
      note: t.description,
    });
  }
  if (hints.length === 0) {
    const recentIn = transfers
      .filter((t) => t.direction === "in")
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (recentIn && recentIn.amount >= 10) {
      hints.push({
        name: recentIn.counterparty ?? "Sam",
        amount: Math.min(recentIn.amount, 50),
        note: "Recent incoming transfer — follow up if it was a split.",
      });
    }
  }
  return hints.slice(0, 3);
}

function estimatePaycheck(deposits: NormalizedDeposit[]): {
  amount: number;
  intervalDays: number;
} {
  if (deposits.length === 0) return { amount: 0, intervalDays: 14 };
  const sorted = [...deposits].sort((a, b) => b.date.localeCompare(a.date));
  const amount = sorted[0]?.amount ?? 0;
  if (sorted.length >= 2) {
    const d1 = new Date(sorted[0].date);
    const d2 = new Date(sorted[1].date);
    const diff = Math.abs(
      (d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff >= 6 && diff <= 16) return { amount, intervalDays: Math.round(diff) };
  }
  return { amount, intervalDays: 14 };
}

export type RawNessieBundle = {
  customerId: string;
  accounts: Record<string, unknown>[];
  perAccount: {
    account: Record<string, unknown>;
    bills: Record<string, unknown>[];
    purchases: Record<string, unknown>[];
    deposits: Record<string, unknown>[];
    transfers: Record<string, unknown>[];
  }[];
};

export function normalizeNessieBundle(raw: RawNessieBundle): FinancialSnapshot {
  let checkingBalance = 0;
  let savingsBalance = 0;
  const bills: NormalizedBill[] = [];
  const purchases: NormalizedPurchase[] = [];
  const deposits: NormalizedDeposit[] = [];
  const transfers: NormalizedTransfer[] = [];

  for (const row of raw.perAccount) {
    const type = str(row.account.type).toLowerCase();
    const balance = num(row.account.balance);
    if (type.includes("saving")) savingsBalance += balance;
    else if (type.includes("credit")) {
      /* skip for liquid projection */
    } else checkingBalance += balance;

    bills.push(...row.bills.map(normalizeBill));
    purchases.push(...row.purchases.map(normalizePurchase));
    deposits.push(...row.deposits.map(normalizeDeposit));
    transfers.push(...row.transfers.map(normalizeTransfer));
  }

  const now = new Date();
  const avgDailySpend = averageDailySpend(purchases, 7, now);
  const avgDailyFoodSpend = averageDailyFoodSpend(purchases, 7, now);
  const paycheck = estimatePaycheck(deposits);

  return {
    fetchedAt: now.toISOString(),
    customerId: raw.customerId,
    checkingBalance,
    savingsBalance,
    totalLiquid: checkingBalance + savingsBalance,
    bills: bills.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    purchases,
    deposits,
    transfers,
    receivables: detectReceivables(transfers),
    avgDailySpend,
    avgDailyFoodSpend,
    estimatedPaycheckAmount: paycheck.amount,
    paycheckIntervalDays: paycheck.intervalDays,
  };
}

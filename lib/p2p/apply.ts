import type { FinancialSnapshot } from "@/lib/nessie/types";
import {
  parseP2pRequestRecord,
  receivableKey,
  type P2pRequestRecord,
  type P2pRequestStatus,
} from "./types";

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Incoming Nessie transfer that likely settles a sent P2P request. */
export function nessieShowsPaymentReceived(
  record: P2pRequestRecord,
  snapshot: FinancialSnapshot,
): boolean {
  if (record.status === "paid") return true;
  const name = record.counterpartyName.toLowerCase();
  const sentDay = record.createdAt.slice(0, 10);
  return snapshot.transfers.some((t) => {
    if (t.direction !== "in") return false;
    if (Math.abs(t.amount - record.amount) >= 0.02) return false;
    if (t.date < sentDay) return false;
    const blob = `${t.description} ${t.counterparty ?? ""}`.toLowerCase();
    return (
      blob.includes(name) ||
      /p2p request|payback|reimburse|split|venmo/i.test(t.description)
    );
  });
}

export function effectiveP2pStatus(
  record: P2pRequestRecord,
  snapshot: FinancialSnapshot | null,
): P2pRequestStatus {
  if (record.status === "paid") return "paid";
  if (snapshot && nessieShowsPaymentReceived(record, snapshot)) return "paid";
  return "pending";
}

export function collectedReceivableKeys(
  records: P2pRequestRecord[],
  snapshot: FinancialSnapshot | null,
): Set<string> {
  const keys = new Set<string>();
  for (const r of records) {
    if (effectiveP2pStatus(r, snapshot) === "paid") keys.add(r.key);
  }
  return keys;
}

export function applyP2pCollectionsToSnapshot(
  snapshot: FinancialSnapshot,
  records: P2pRequestRecord[],
): FinancialSnapshot {
  const collected = collectedReceivableKeys(records, snapshot);
  if (collected.size === 0) return snapshot;

  let boost = 0;
  for (const r of records) {
    if (collected.has(r.key)) boost += r.amount;
  }

  const receivables = snapshot.receivables.filter(
    (r) => !collected.has(receivableKey(r.name, r.amount)),
  );

  const savingsBalance = roundMoney(snapshot.savingsBalance + boost);
  const totalLiquid = roundMoney(snapshot.checkingBalance + savingsBalance);

  return {
    ...snapshot,
    savingsBalance,
    totalLiquid,
    receivables,
  };
}

export function mergeP2pWithNessieSync(
  records: P2pRequestRecord[],
  snapshot: FinancialSnapshot,
): P2pRequestRecord[] {
  let changed = false;
  const next = records.map((r) => {
    if (r.status === "paid") return r;
    if (nessieShowsPaymentReceived(r, snapshot)) {
      changed = true;
      return { ...r, status: "paid" as const };
    }
    return r;
  });
  return changed ? next : records;
}


import type { TipCandidate } from "@/lib/advice/rules";
import type { FinancialSnapshot, ReceivableHint } from "@/lib/nessie/types";
import { effectiveP2pStatus } from "./apply";
import { receivableKey, type P2pRequestRecord } from "./types";

export type P2pActionStatus = "request" | "pending" | "paid";

export type P2pAction = {
  key: string;
  counterpartyName: string;
  amount: number;
  note?: string;
  etaImpactDays?: number;
  status: P2pActionStatus;
  tipId?: string;
};

function statusForKey(
  key: string,
  records: P2pRequestRecord[],
  snapshot: FinancialSnapshot | null,
): P2pActionStatus {
  const match = records.find((r) => r.key === key);
  if (!match) return "request";
  return effectiveP2pStatus(match, snapshot) === "paid" ? "paid" : "pending";
}

export function p2pActionFromReceivable(
  r: ReceivableHint,
  records: P2pRequestRecord[],
  snapshot: FinancialSnapshot | null,
  extras?: { etaImpactDays?: number; tipId?: string },
): P2pAction {
  const key = receivableKey(r.name, r.amount);
  return {
    key,
    counterpartyName: r.name,
    amount: r.amount,
    note: r.note,
    etaImpactDays: extras?.etaImpactDays,
    tipId: extras?.tipId,
    status: statusForKey(key, records, snapshot),
  };
}

export function p2pActionFromReceivableTip(
  tip: TipCandidate,
  records: P2pRequestRecord[],
  snapshot: FinancialSnapshot | null,
): P2pAction | null {
  if (tip.templateKey !== "receivable") return null;
  const name = String(tip.facts.name ?? "").trim();
  const amount = Number(tip.facts.amount);
  if (!name || !Number.isFinite(amount) || amount <= 0) return null;
  const etaImpactDays =
    typeof tip.facts.etaImpactDays === "number"
      ? tip.facts.etaImpactDays
      : undefined;
  return p2pActionFromReceivable(
    { name, amount, note: "" },
    records,
    snapshot,
    { etaImpactDays, tipId: tip.id },
  );
}

export function primaryP2pAction(
  snapshot: FinancialSnapshot,
  tips: TipCandidate[],
  records: P2pRequestRecord[],
): P2pAction | null {
  const recvTip = tips.find((t) => t.templateKey === "receivable");
  if (recvTip) {
    const fromTip = p2pActionFromReceivableTip(recvTip, records, snapshot);
    if (fromTip && fromTip.status !== "paid") return fromTip;
  }
  for (const r of snapshot.receivables) {
    const action = p2pActionFromReceivable(r, records, snapshot);
    if (action.status !== "paid") return action;
  }
  return null;
}

export function p2pRequestButtonLabel(action: P2pAction): string {
  return `Request $${action.amount} from ${action.counterpartyName}`;
}

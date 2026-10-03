export type P2pRequestStatus = "pending" | "paid";

export type P2pRequestRecord = {
  id: string;
  key: string;
  counterpartyName: string;
  amount: number;
  status: P2pRequestStatus;
  createdAt: string;
  nessieTransferId?: string;
  note?: string;
};

export function receivableKey(name: string, amount: number): string {
  const n = name.trim().toLowerCase().replace(/\s+/g, " ");
  const a = Math.round(amount * 100) / 100;
  return `${n}:${a}`;
}

export function parseP2pRequestList(raw: unknown): P2pRequestRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => parseP2pRequestRecord(item))
    .filter((r): r is P2pRequestRecord => r !== null);
}

export function parseP2pRequestRecord(raw: unknown): P2pRequestRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.counterpartyName === "string" ? o.counterpartyName.trim() : "";
  const amount = Number(o.amount);
  const status = o.status === "paid" ? "paid" : o.status === "pending" ? "pending" : null;
  const id = typeof o.id === "string" ? o.id : "";
  const key =
    typeof o.key === "string" && o.key
      ? o.key
      : name && Number.isFinite(amount)
        ? receivableKey(name, amount)
        : "";
  if (!id || !key || !name || !Number.isFinite(amount) || amount <= 0 || !status) {
    return null;
  }
  const createdAt =
    typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  return {
    id,
    key,
    counterpartyName: name,
    amount: Math.round(amount * 100) / 100,
    status,
    createdAt,
    nessieTransferId:
      typeof o.nessieTransferId === "string" ? o.nessieTransferId : undefined,
    note: typeof o.note === "string" ? o.note : undefined,
  };
}

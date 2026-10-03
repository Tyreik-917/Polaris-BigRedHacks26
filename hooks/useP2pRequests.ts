"use client";

import { mergeP2pWithNessieSync } from "@/lib/p2p/apply";
import {
  parseP2pRequestList,
  receivableKey,
  type P2pRequestRecord,
} from "@/lib/p2p/types";
import type { FinancialSnapshot } from "@/lib/nessie/types";
import { useCallback, useEffect, useState } from "react";

function storageKey(customerId: string | null): string | null {
  if (!customerId) return null;
  return `polaris:p2p-requests:${customerId}`;
}

function loadRecords(key: string | null): P2pRequestRecord[] {
  if (!key || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return parseP2pRequestList(JSON.parse(raw));
  } catch {
    return [];
  }
}

function persistRecords(key: string | null, records: P2pRequestRecord[]) {
  if (!key || typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(records));
  } catch {
    /* quota / private mode */
  }
}

export function useP2pRequests(customerId: string | null) {
  const [records, setRecordsState] = useState<P2pRequestRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const key = storageKey(customerId);
    setRecordsState(loadRecords(key));
    setHydrated(true);
  }, [customerId]);

  const setRecords = useCallback(
    (next: P2pRequestRecord[]) => {
      setRecordsState(next);
      persistRecords(storageKey(customerId), next);
    },
    [customerId],
  );

  const upsertPending = useCallback(
    (input: {
      counterpartyName: string;
      amount: number;
      note?: string;
      nessieTransferId?: string;
    }) => {
      const key = receivableKey(input.counterpartyName, input.amount);
      const id = crypto.randomUUID();
      const record: P2pRequestRecord = {
        id,
        key,
        counterpartyName: input.counterpartyName.trim(),
        amount: Math.round(input.amount * 100) / 100,
        status: "pending",
        createdAt: new Date().toISOString(),
        nessieTransferId: input.nessieTransferId,
        note: input.note,
      };
      setRecordsState((prev) => {
        const withoutDup = prev.filter((r) => r.key !== key || r.status === "paid");
        const next = [record, ...withoutDup].slice(0, 20);
        persistRecords(storageKey(customerId), next);
        return next;
      });
      return record;
    },
    [customerId],
  );

  const markPaid = useCallback(
    (key: string) => {
      setRecordsState((prev) => {
        const next = prev.map((r) =>
          r.key === key ? { ...r, status: "paid" as const } : r,
        );
        persistRecords(storageKey(customerId), next);
        return next;
      });
    },
    [customerId],
  );

  const syncWithSnapshot = useCallback(
    (snapshot: FinancialSnapshot) => {
      setRecordsState((prev) => {
        const next = mergeP2pWithNessieSync(prev, snapshot);
        if (next === prev) return prev;
        persistRecords(storageKey(customerId), next);
        return next;
      });
    },
    [customerId],
  );

  return {
    records,
    hydrated,
    upsertPending,
    markPaid,
    syncWithSnapshot,
    setRecords,
  };
}

"use client";

import { polarisFetch } from "@/lib/api/client-fetch";
import { financialSnapshotSignature } from "@/lib/nessie/purchase-detection";
import type { FinancialSnapshot } from "@/lib/nessie/types";
import { useCallback, useState } from "react";

async function readApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    if (data.error) return data.error;
  } catch {
    /* fall through */
  }
  return `Request failed (${res.status})`;
}

export function useFinancialSnapshot() {
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchSnapshot = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await polarisFetch("/api/sync");
      if (!res.ok) throw new Error(await readApiError(res));
      const data = (await res.json()) as FinancialSnapshot;
      setSnapshot((prev) => {
        if (
          silent &&
          prev &&
          financialSnapshotSignature(prev) === financialSnapshotSignature(data)
        ) {
          return prev;
        }
        return data;
      });
      return data;
    } catch (e) {
      if (!silent) {
        const msg = e instanceof Error ? e.message : "Sync failed";
        setError(msg);
      }
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const sync = useCallback(() => fetchSnapshot(), [fetchSnapshot]);
  const syncSilent = useCallback(
    () => fetchSnapshot({ silent: true }),
    [fetchSnapshot],
  );

  return { snapshot, loading, error, sync, syncSilent, setSnapshot };
}

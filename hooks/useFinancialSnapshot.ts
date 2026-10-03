"use client";

import { polarisFetch } from "@/lib/api/client-fetch";
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
  const [usingFixture, setUsingFixture] = useState(false);

  const sync = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await polarisFetch("/api/sync");
      if (!res.ok) throw new Error(await readApiError(res));
      const data = (await res.json()) as FinancialSnapshot;
      setSnapshot(data);
      setUsingFixture(data.customerId === "demo");
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { snapshot, loading, error, sync, setSnapshot, usingFixture };
}

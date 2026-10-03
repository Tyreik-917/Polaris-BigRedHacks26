"use client";

import {
  activeUserReports,
  nessieAlreadyShowsSpend,
} from "@/lib/user-reports/apply";
import {
  parseUserReportedSpendInput,
  type UserReportedSpend,
} from "@/lib/user-reports/types";
import type { FinancialSnapshot } from "@/lib/nessie/types";
import { useCallback, useEffect, useState } from "react";

function storageKey(customerId: string | null): string | null {
  if (!customerId) return null;
  return `polaris:user-reported-spends:${customerId}`;
}

function loadReports(key: string | null): UserReportedSpend[] {
  if (!key || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseUserReportedSpendInput)
      .filter((r): r is UserReportedSpend => r != null);
  } catch {
    return [];
  }
}

function persistReports(key: string | null, reports: UserReportedSpend[]) {
  if (!key || typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(reports));
  } catch {
    /* quota / private mode */
  }
}

export function useUserReportedSpending(customerId: string | null) {
  const [reports, setReportsState] = useState<UserReportedSpend[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const key = storageKey(customerId);
    setReportsState(loadReports(key));
    setHydrated(true);
  }, [customerId]);

  const setReports = useCallback(
    (next: UserReportedSpend[]) => {
      setReportsState(next);
      persistReports(storageKey(customerId), next);
    },
    [customerId],
  );

  const addReport = useCallback(
    (report: UserReportedSpend) => {
      setReportsState((prev) => {
        const next = [report, ...prev].slice(0, 50);
        persistReports(storageKey(customerId), next);
        return next;
      });
    },
    [customerId],
  );

  const removeReport = useCallback(
    (id: string) => {
      setReportsState((prev) => {
        const next = prev.filter((r) => r.id !== id);
        persistReports(storageKey(customerId), next);
        return next;
      });
    },
    [customerId],
  );

  const pruneSyncedWithNessie = useCallback(
    (snapshot: FinancialSnapshot) => {
      setReportsState((prev) => {
        const next = prev.filter((r) => !nessieAlreadyShowsSpend(r, snapshot.purchases));
        if (next.length === prev.length) return prev;
        persistReports(storageKey(customerId), next);
        return next;
      });
    },
    [customerId],
  );

  const pendingForSnapshot = useCallback(
    (snapshot: FinancialSnapshot | null) => {
      if (!snapshot) return reports;
      return activeUserReports(snapshot, reports);
    },
    [reports],
  );

  return {
    reports,
    hydrated,
    addReport,
    removeReport,
    pruneSyncedWithNessie,
    pendingForSnapshot,
    setReports,
  };
}

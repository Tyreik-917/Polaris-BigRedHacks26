"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildFinancialCheckIn,
  formatCheckInHorizon,
  formatCheckInMoney,
} from "@/lib/nessie/check-in";
import type { FinancialSnapshot } from "@/lib/nessie/types";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

type Props = {
  snapshot: FinancialSnapshot | null;
  loading?: boolean;
  error?: string | null;
  goalTargetDate?: string;
  /** Shown under the title when not loading */
  contextLine?: string;
};

export function FinancialCheckInCard({
  snapshot,
  loading,
  error,
  goalTargetDate,
  contextLine,
}: Props) {
  const checkIn = useMemo(
    () => (snapshot ? buildFinancialCheckIn(snapshot, { goalTargetDate }) : null),
    [snapshot, goalTargetDate],
  );

  return (
    <Card className="border-sky-900/40 bg-slate-950/80 ring-1 ring-sky-950/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-100">
          Financial check-in
        </CardTitle>
        <CardDescription className="text-slate-400">
          {loading && !snapshot
            ? "Pulling balances, bills, spending, and money owed from Capital One Nessie…"
            : (contextLine ??
              "Your real picture from Nessie — balances, upcoming bills, habits, and receivables.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !snapshot && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Syncing Nessie…
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {checkIn && snapshot && (
          <>
            <p className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2.5 text-sm leading-relaxed text-sky-100/95">
              {checkIn.oneLiner}
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <dt className="text-slate-500">Checking</dt>
                <dd className="text-lg font-medium text-slate-100">
                  {formatCheckInMoney(snapshot.checkingBalance)}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <dt className="text-slate-500">Savings</dt>
                <dd className="text-lg font-medium text-slate-100">
                  {formatCheckInMoney(snapshot.savingsBalance)}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <dt className="text-slate-500">
                  Bills before {formatCheckInHorizon(checkIn.billHorizonDate)}
                </dt>
                <dd className="text-lg font-medium text-slate-100">
                  {formatCheckInMoney(checkIn.billsBeforeTotal)}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <dt className="text-slate-500">Food (7-day avg)</dt>
                <dd className="text-lg font-medium text-slate-100">
                  {formatCheckInMoney(checkIn.foodPerWeek)}/wk
                </dd>
              </div>
            </dl>
            {checkIn.upcomingBills.length > 0 && (
              <ul className="space-y-1.5 text-xs text-slate-400">
                {checkIn.upcomingBills.slice(0, 4).map((bill) => (
                  <li
                    key={bill.id}
                    className="flex justify-between gap-2 border-b border-slate-800/60 pb-1 last:border-0"
                  >
                    <span className="truncate text-slate-300">{bill.payee}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatCheckInMoney(bill.amount)} ·{" "}
                      {formatCheckInHorizon(bill.dueDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {snapshot.receivables.length > 0 && (
              <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 text-sm">
                <p className="font-medium text-emerald-200/90">Money owed to you</p>
                <ul className="mt-1 space-y-0.5 text-emerald-100/80">
                  {snapshot.receivables.map((r, i) => (
                    <li key={`${r.name}-${i}`}>
                      {r.name}: {formatCheckInMoney(r.amount)}
                      {r.note ? (
                        <span className="text-emerald-200/60"> — {r.note}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

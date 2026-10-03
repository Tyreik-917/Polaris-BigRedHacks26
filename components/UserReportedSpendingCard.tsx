"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VoiceNavigator } from "@/components/VoiceNavigator";
import { polarisFetch } from "@/lib/api/client-fetch";
import { formatCheckInMoney } from "@/lib/nessie/check-in";
import type { UserReportedSpend } from "@/lib/user-reports/types";
import { Loader2, MessageSquarePlus, X } from "lucide-react";
import { useCallback, useState } from "react";

type Props = {
  reports: UserReportedSpend[];
  disabled?: boolean;
  onReportAdded: (report: UserReportedSpend) => void;
  onRemove: (id: string) => void;
};

export function UserReportedSpendingCard({
  reports,
  disabled,
  onReportAdded,
  onRemove,
}: Props) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitText = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await polarisFetch("/api/spending/report/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = (await res.json()) as {
        report?: UserReportedSpend;
        error?: string;
      };
      if (!res.ok || !data.report) {
        setError(data.error ?? "Could not parse that spending.");
        return;
      }
      onReportAdded(data.report);
      setText("");
    } catch {
      setError("Could not reach Polaris to parse spending.");
    } finally {
      setSubmitting(false);
    }
  }, [disabled, onReportAdded, text]);

  return (
    <Card className="border-violet-900/40 bg-slate-950/80 ring-1 ring-violet-950/40">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-violet-200/95">
          <MessageSquarePlus className="h-4 w-4 shrink-0" aria-hidden />
          <CardTitle className="text-base font-medium">
            Tell Polaris what Nessie missed
          </CardTitle>
        </div>
        <CardDescription className="text-slate-400">
          Cash, bookstore, or same-day buys that have not hit your accounts yet —
          by text or voice. We fold them into your route math.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void submitText();
          }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='e.g. "Also had to buy an $85 textbook today"'
            disabled={disabled || submitting}
            className="border-slate-700 bg-slate-900/60"
            maxLength={500}
          />
          <Button
            type="submit"
            disabled={disabled || submitting || !text.trim()}
            className="shrink-0"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              "Add to route"
            )}
          </Button>
        </form>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <VoiceNavigator
          mode="report_spending"
          disabled={disabled || submitting}
          onSpendingHeard={(report) => {
            onReportAdded(report);
            setError(null);
          }}
        />
        {reports.length > 0 && (
          <ul className="space-y-2 border-t border-slate-800/80 pt-3 text-sm">
            {reports.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2"
              >
                <div>
                  <p className="font-medium text-slate-100">{r.description}</p>
                  <p className="text-xs text-slate-500">
                    {formatCheckInMoney(r.amount)} · {r.date}
                    <span className="text-violet-300/80"> · you reported</span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-slate-400"
                  aria-label={`Remove reported ${r.description}`}
                  onClick={() => onRemove(r.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

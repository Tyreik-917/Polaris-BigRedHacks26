"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TipCandidate } from "@/lib/advice/rules";

type Props = {
  lines: string[];
  tips: TipCandidate[];
  loading?: boolean;
};

export function DirectionsPanel({ lines, tips, loading }: Props) {
  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader>
        <CardTitle>Turn-by-turn</CardTitle>
        <CardDescription>GPS directions for your money</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <p className="text-sm text-slate-400">Recalculating route…</p>
        )}
        {!loading && lines.length === 0 && (
          <p className="text-sm text-slate-400">
            Set a goal and sync your accounts to get directions.
          </p>
        )}
        <ul className="space-y-3">
          {lines.map((line, i) => (
            <li
              key={`${i}-${line.slice(0, 12)}`}
              className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200"
            >
              {line}
            </li>
          ))}
        </ul>
        {tips.length > 0 && lines.length === 0 && !loading && (
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            {tips.map((t) => (
              <li key={t.id}>{t.templateKey}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

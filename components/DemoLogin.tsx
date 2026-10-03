"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEMO_PERSONA } from "@/lib/demo/persona";
import { readApiError } from "@/lib/api/read-error";
import { Sparkles } from "lucide-react";
import { useState } from "react";

type Props = {
  onDemoSuccess: (payload: {
    customerId: string | null;
    fixtureMode: boolean;
    displayName: string;
  }) => void;
};

export function DemoLogin({ onDemoSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-4 py-12">
      <header className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-400/80">
          Navigation for your finances
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">
          Polaris
        </h1>
        <p className="text-sm text-slate-400">
          Sign in for the hackathon demo — no password, just a seeded Nessie
          student profile.
        </p>
      </header>

      <Card className="border-slate-800 bg-slate-950/80 ring-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Demo login</CardTitle>
          <CardDescription>
            Skips real authentication and links your session to our Capital One
            Nessie demo customer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300">
            <p className="font-medium text-slate-100">{DEMO_PERSONA.fullName}</p>
            <p className="mt-1 text-slate-400">{DEMO_PERSONA.blurb}</p>
          </div>
          <Button
            type="button"
            className="w-full gap-2"
            disabled={loading}
            onClick={() => {
              void (async () => {
                setLoading(true);
                setError(null);
                try {
                  const res = await fetch("/api/auth/demo", { method: "POST" });
                  if (!res.ok) {
                    setError(await readApiError(res));
                    return;
                  }
                  const data = (await res.json()) as {
                    customerId: string | null;
                    fixtureMode: boolean;
                    persona: { fullName: string };
                  };
                  onDemoSuccess({
                    customerId: data.customerId,
                    fixtureMode: data.fixtureMode,
                    displayName: data.persona.fullName,
                  });
                } catch {
                  setError("Could not start demo session. Try again.");
                } finally {
                  setLoading(false);
                }
              })();
            }}
          >
            <Sparkles className="h-4 w-4" />
            {loading
              ? "Connecting…"
              : `Continue as ${DEMO_PERSONA.shortLabel}`}
          </Button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-slate-600">
        Judges: one tap loads Maya&apos;s accounts. Production users can link
        their own Nessie ID from the dashboard.
      </p>
    </div>
  );
}

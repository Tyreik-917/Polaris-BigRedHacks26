"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidNessieCustomerId, useNessieCustomer } from "@/hooks/useNessieCustomer";
import { Settings2 } from "lucide-react";
import { useState } from "react";

type Props = {
  hasServerDefault: boolean;
  onLinked?: () => void;
  required?: boolean;
};

export function AccountSetup({
  hasServerDefault,
  onLinked,
  required,
}: Props) {
  const { customerId, setCustomerId, hydrated } = useNessieCustomer();
  const [draft, setDraft] = useState(customerId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!hydrated) return null;

  const linked = Boolean(customerId) || hasServerDefault;

  if (linked && !required) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-slate-700"
          onClick={() => setOpen(true)}
        >
          <Settings2 className="h-4 w-4" />
          Nessie account
        </Button>
        <DialogContent className="border-slate-800 bg-slate-950">
          <DialogHeader>
            <DialogTitle>Nessie customer ID</DialogTitle>
            <DialogDescription>
              Your ID links Polaris to your Capital One hackathon customer data.
              Stored only in this browser — never on our servers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cid">Customer ID</Label>
            <Input
              id="cid"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="border-slate-700 bg-slate-900 font-mono text-sm"
              placeholder="Customer ID from Nessie profile"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                if (!isValidNessieCustomerId(draft)) {
                  setError("Enter a valid customer ID from your Nessie profile.");
                  return;
                }
                setError(null);
                setCustomerId(draft);
                setOpen(false);
                onLinked?.();
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Alert className="border-sky-900/50 bg-sky-950/30">
      <AlertTitle>Connect your Nessie account</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          Paste your <strong>customer ID</strong> from the{" "}
          <a
            href="http://api.nessieisreal.com"
            className="text-sky-400 underline"
            target="_blank"
            rel="noreferrer"
          >
            Capital One Nessie
          </a>{" "}
          hackathon profile. We read accounts, bills, and spending to plot your
          route — nothing is stored in a database.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="border-slate-700 bg-slate-900 font-mono text-sm"
            placeholder="Customer ID"
          />
          <Button
            type="button"
            onClick={() => {
              if (!isValidNessieCustomerId(draft)) {
                setError("Invalid customer ID format.");
                return;
              }
              setError(null);
              setCustomerId(draft);
              onLinked?.();
            }}
          >
            Link account
          </Button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </AlertDescription>
    </Alert>
  );
}

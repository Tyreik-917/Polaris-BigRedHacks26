import { assertNessieConfigured, getServerConfig } from "@/lib/env.server";
import { fetchCustomerAccounts } from "./client";

const BASE =
  process.env.NESSIE_API_BASE?.replace(/\/$/, "") ??
  "https://api.nessieisreal.com";

function apiKey(): string {
  const key = process.env.NESSIE_API_KEY;
  if (!key) throw new Error("NESSIE_API_KEY is not set");
  return key;
}

async function nessiePost<T>(path: string, body: unknown): Promise<T> {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey())}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Nessie POST ${path}: ${res.status} ${text.slice(0, 400)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export type CreateP2pRequestInput = {
  counterpartyName: string;
  amount: number;
  note?: string;
};

export type CreateP2pRequestResult = {
  transferId: string;
  fixture: boolean;
};

export async function createP2pTransferRequest(
  customerId: string,
  input: CreateP2pRequestInput,
): Promise<CreateP2pRequestResult> {
  const { useFixture } = getServerConfig();
  if (useFixture) {
    return {
      transferId: `fixture-p2p-${Date.now()}`,
      fixture: true,
    };
  }

  assertNessieConfigured();
  const accounts = await fetchCustomerAccounts(customerId);
  const checking = accounts.find((a) =>
    String(a.type ?? "")
      .toLowerCase()
      .includes("checking"),
  );
  if (!checking?._id) {
    throw new Error("No checking account found for this Nessie customer.");
  }

  const accountId = String(checking._id);
  const note = input.note?.trim();
  const description = note
    ? `${input.counterpartyName} — P2P request $${input.amount}: ${note} (waiting on payback)`
    : `${input.counterpartyName} — P2P request $${input.amount} (waiting on payback)`;

  const created = await nessiePost<Record<string, unknown>>(
    `/accounts/${accountId}/transfers`,
    {
      amount: input.amount,
      description,
      transaction_date: isoToday(),
      status: "pending",
    },
  );

  const transferId = String(
    created._id ??
      (created.objectCreated as Record<string, unknown> | undefined)?._id ??
      `transfer-${Date.now()}`,
  );

  return { transferId, fixture: false };
}

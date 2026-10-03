/**
 * Typed Nessie client — server-only. All routes go through here.
 */
const BASE =
  process.env.NESSIE_API_BASE?.replace(/\/$/, "") ??
  "http://api.nessieisreal.com";

const TIMEOUT_MS = 8_000;

function apiKey(): string {
  const key = process.env.NESSIE_API_KEY?.trim();
  if (!key) throw new Error("NESSIE_API_KEY is not set");
  return key;
}

function withKey(path: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${BASE}${path}${sep}key=${encodeURIComponent(apiKey())}`;
}

async function nessieFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const started = Date.now();
  const res = await fetch(withKey(path), {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const ms = Date.now() - started;
  console.info(`[nessie] ${init?.method ?? "GET"} ${path} ${ms}ms`);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Nessie ${path} failed (${res.status})`);
  }
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export type NessieCreateResponse = {
  objectCreated?: { _id?: string };
  _id?: string;
};

export async function createCustomer(body: Record<string, unknown>) {
  return nessieFetch<NessieCreateResponse>("/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getCustomer(id: string) {
  return nessieFetch<Record<string, unknown>>(`/customers/${id}`);
}

export async function createAccount(
  customerId: string,
  body: Record<string, unknown>,
) {
  return nessieFetch<NessieCreateResponse>(
    `/customers/${customerId}/accounts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export async function getAccount(id: string) {
  return nessieFetch<Record<string, unknown>>(`/accounts/${id}`);
}

export async function listCustomerAccounts(customerId: string) {
  return nessieFetch<Record<string, unknown>[]>(
    `/customers/${customerId}/accounts`,
  );
}

export async function createBill(
  accountId: string,
  body: Record<string, unknown>,
) {
  return nessieFetch<NessieCreateResponse>(`/accounts/${accountId}/bills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function listBills(accountId: string) {
  return nessieFetch<Record<string, unknown>[]>(`/accounts/${accountId}/bills`);
}

export async function createDeposit(
  accountId: string,
  body: Record<string, unknown>,
) {
  return nessieFetch<NessieCreateResponse>(`/accounts/${accountId}/deposits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function listDeposits(accountId: string) {
  return nessieFetch<Record<string, unknown>[]>(
    `/accounts/${accountId}/deposits`,
  );
}

export async function createPurchase(
  accountId: string,
  body: Record<string, unknown>,
) {
  return nessieFetch<NessieCreateResponse>(`/accounts/${accountId}/purchases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function listPurchases(accountId: string) {
  return nessieFetch<Record<string, unknown>[]>(
    `/accounts/${accountId}/purchases`,
  );
}

export async function createTransfer(
  accountId: string,
  body: Record<string, unknown>,
) {
  return nessieFetch<NessieCreateResponse>(`/accounts/${accountId}/transfers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function listTransfers(accountId: string) {
  return nessieFetch<Record<string, unknown>[]>(
    `/accounts/${accountId}/transfers`,
  );
}

export async function createMerchant(body: Record<string, unknown>) {
  return nessieFetch<NessieCreateResponse>("/merchants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function listMerchants() {
  return nessieFetch<Record<string, unknown>[]>("/merchants");
}

export function createdId(res: NessieCreateResponse): string | null {
  return res.objectCreated?._id ?? res._id ?? null;
}

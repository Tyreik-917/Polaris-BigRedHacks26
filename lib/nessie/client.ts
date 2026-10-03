const BASE =
  process.env.NESSIE_API_BASE?.replace(/\/$/, "") ??
  "https://api.nessieisreal.com";

function apiKey(): string {
  const key = process.env.NESSIE_API_KEY;
  if (!key) throw new Error("NESSIE_API_KEY is not set");
  return key;
}

async function nessieGet<T>(path: string): Promise<T> {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey())}`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nessie ${path}: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCustomerAccounts(cid: string) {
  return nessieGet<Record<string, unknown>[]>(`/customers/${cid}/accounts`);
}

export async function fetchAccountBills(accountId: string) {
  return nessieGet<Record<string, unknown>[]>(`/accounts/${accountId}/bills`);
}

export async function fetchAccountPurchases(accountId: string) {
  return nessieGet<Record<string, unknown>[]>(
    `/accounts/${accountId}/purchases`,
  );
}

export async function fetchAccountDeposits(accountId: string) {
  return nessieGet<Record<string, unknown>[]>(
    `/accounts/${accountId}/deposits`,
  );
}

export async function fetchAccountTransfers(accountId: string) {
  return nessieGet<Record<string, unknown>[]>(
    `/accounts/${accountId}/transfers`,
  );
}

export async function fetchFullCustomerSnapshot(cid: string) {
  const accounts = await fetchCustomerAccounts(cid);
  const perAccount = await Promise.all(
    accounts.map(async (acc) => {
      const id = String(acc._id);
      const [bills, purchases, deposits, transfers] = await Promise.all([
        fetchAccountBills(id).catch(() => []),
        fetchAccountPurchases(id).catch(() => []),
        fetchAccountDeposits(id).catch(() => []),
        fetchAccountTransfers(id).catch(() => []),
      ]);
      return { account: acc, bills, purchases, deposits, transfers };
    }),
  );
  return { customerId: cid, accounts, perAccount };
}

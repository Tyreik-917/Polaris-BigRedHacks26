/**
 * Creates a Polaris-ready Nessie customer (accounts, bills, deposits, purchases, transfer).
 *
 * Usage:
 *   1. Sign in at http://api.nessieisreal.com and copy your API key into .env.local
 *   2. npm run demo:nessie
 *
 * Writes NESSIE_CUSTOMER_ID to .env.local and demo-nessie.credentials.json (gitignored).
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const BASE =
  process.env.NESSIE_API_BASE?.replace(/\/$/, "") ??
  "https://api.nessieisreal.com";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

function q(key: string) {
  return `?key=${encodeURIComponent(key)}`;
}

async function nessiePost<T>(
  key: string,
  path: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}${q(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* raw */
  }
  if (!res.ok) {
    throw new Error(`POST ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return data as T;
}

async function nessieGet<T>(key: string, path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}${q(key)}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text) as T;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function upsertEnvLocal(customerId: string) {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    writeFileSync(
      path,
      `NESSIE_API_KEY=\nNESSIE_CUSTOMER_ID=${customerId}\n`,
      "utf8",
    );
    return;
  }
  let content = readFileSync(path, "utf8");
  if (/^NESSIE_CUSTOMER_ID=/m.test(content)) {
    content = content.replace(
      /^NESSIE_CUSTOMER_ID=.*$/m,
      `NESSIE_CUSTOMER_ID=${customerId}`,
    );
  } else {
    content += `\nNESSIE_CUSTOMER_ID=${customerId}\n`;
  }
  writeFileSync(path, content, "utf8");
}

async function main() {
  loadEnvLocal();
  const key = process.env.NESSIE_API_KEY?.trim();
  if (!key) {
    console.error(`
No NESSIE_API_KEY in .env.local.

1. Open http://api.nessieisreal.com and sign in (GitHub / hackathon account).
2. Copy your API key from your profile.
3. Add to .env.local:  NESSIE_API_KEY=your_key_here
4. Run again: npm run demo:nessie

Until then, test with fixture data:  POLARIS_USE_FIXTURE=true npm run dev
`);
    process.exit(1);
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  console.log("Creating demo customer on Nessie…");

  const customerRes = await nessiePost<{
    objectCreated?: { _id?: string };
  }>(key, "/customers", {
    first_name: "Maya",
    last_name: "Chen",
    address: {
      street_number: "100",
      street_name: "Ho Plaza",
      city: "Ithaca",
      state: "NY",
      zip: "14853",
    },
  });

  const customerId = customerRes.objectCreated?._id;
  if (!customerId) {
    throw new Error("Customer created but no _id in response");
  }

  const checking = await nessiePost<{ objectCreated?: { _id?: string } }>(
    key,
    `/customers/${customerId}/accounts`,
    {
      type: "Checking",
      nickname: "Campus Checking",
      rewards: 0,
      balance: 318.42,
    },
  );
  const savings = await nessiePost<{ objectCreated?: { _id?: string } }>(
    key,
    `/customers/${customerId}/accounts`,
    {
      type: "Savings",
      nickname: "Flight Fund",
      rewards: 0,
      balance: 142.5,
    },
  );

  const checkingId = checking.objectCreated?._id;
  const savingsId = savings.objectCreated?._id;
  if (!checkingId || !savingsId) {
    throw new Error("Failed to create checking/savings accounts");
  }

  await nessiePost(key, `/accounts/${checkingId}/bills`, {
    status: "pending",
    payee: "Campus Rent",
    nickname: "rent",
    payment_date: isoDate(addDays(today, 4)),
    recurring_date: 1,
    payment_amount: 650,
  });

  await nessiePost(key, `/accounts/${checkingId}/bills`, {
    status: "pending",
    payee: "Phone Bill",
    nickname: "phone",
    payment_date: isoDate(addDays(today, 9)),
    recurring_date: 1,
    payment_amount: 45,
  });

  await nessiePost(key, `/accounts/${checkingId}/deposits`, {
    medium: "balance",
    amount: 450,
    description: "Campus job paycheck",
    transaction_date: isoDate(addDays(today, -6)),
    status: "completed",
  });

  await nessiePost(key, `/accounts/${checkingId}/deposits`, {
    medium: "balance",
    amount: 450,
    description: "Campus job paycheck",
    transaction_date: isoDate(addDays(today, -20)),
    status: "completed",
  });

  const merchants = await nessieGet<{ _id: string; name?: string }[]>(
    key,
    "/merchants",
  );
  let merchantId = merchants[0]?._id;
  if (!merchantId) {
    const created = await nessiePost<{ objectCreated?: { _id?: string } }>(
      key,
      "/merchants",
      {
        name: "Campus Cafe",
        category: "Food",
        address: {
          street_number: "100",
          street_name: "Ho Plaza",
          city: "Ithaca",
          state: "NY",
          zip: "14853",
        },
        geocode: { lat: 42.45, lng: -76.48 },
      },
    );
    const createdId = created.objectCreated?._id;
    if (createdId) merchantId = createdId;
  }
  if (!merchantId) {
    throw new Error("Could not resolve or create a merchant for purchases");
  }

  const purchaseDays = [0, 1, 2, 4, 5, 7];
  const amounts = [12.5, 18.2, 9.8, 22, 15, 11];
  for (let i = 0; i < purchaseDays.length; i++) {
    await nessiePost(key, `/accounts/${checkingId}/purchases`, {
      merchant_id: merchantId,
      medium: "balance",
      amount: amounts[i],
      description: "Campus spending",
      purchase_date: isoDate(addDays(today, -purchaseDays[i])),
      status: "completed",
    });
  }

  try {
    await nessiePost(key, `/accounts/${checkingId}/transfers`, {
      amount: 25,
      description: "Sam owes me for weekend tickets — waiting on payback",
      transaction_date: isoDate(addDays(today, -7)),
      status: "pending",
    });
  } catch (e) {
    console.warn(
      "Transfer seed skipped (API schema):",
      e instanceof Error ? e.message : e,
    );
  }

  const credPath = resolve(process.cwd(), "demo-nessie.credentials.json");
  const credentials = {
    createdAt: new Date().toISOString(),
    customerId,
    checkingAccountId: checkingId,
    savingsAccountId: savingsId,
    profile: {
      name: "Maya Chen",
      suggestedGoal: {
        label: "$400 flight home for winter break",
        targetAmount: 400,
        targetDate: isoDate(addDays(today, 75)),
      },
    },
  };
  writeFileSync(credPath, JSON.stringify(credentials, null, 2), "utf8");
  upsertEnvLocal(customerId);

  console.log(`
Polaris demo Nessie customer ready.

  Customer ID:  ${customerId}
  Checking:     ${checkingId} ($318.42)
  Savings:      ${savingsId} ($142.50 — used for goal progress)

Saved to:
  • .env.local (NESSIE_CUSTOMER_ID)
  • demo-nessie.credentials.json

Next steps:
  1. npm run dev
  2. In Polaris, open "Nessie account" if needed — ID should match above
  3. Try goal: "${credentials.profile.suggestedGoal.label}" by ${credentials.profile.suggestedGoal.targetDate}
`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

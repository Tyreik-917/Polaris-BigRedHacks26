/**
 * Idempotent Nessie seed for Maya + Sam (spec).
 * Run: npx tsx scripts/seed-nessie.ts [--reset]
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import type { SeedIds } from "../lib/types";

const SEED_PATH = resolve(process.cwd(), "data/seed-ids.json");

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

async function main() {
  loadEnvLocal();
  const reset = process.argv.includes("--reset");
  if (existsSync(SEED_PATH) && !reset) {
    console.log(`Seed exists at data/seed-ids.json — skip (use --reset to recreate).`);
    process.exit(0);
  }

  const key = process.env.NESSIE_API_KEY?.trim();
  if (!key) {
    console.error("Set NESSIE_API_KEY in .env.local");
    process.exit(1);
  }

  const nessie = await import("../lib/nessie");

  const ithaca = {
    street_number: "100",
    street_name: "Ho Plaza",
    city: "Ithaca",
    state: "NY",
    zip: "14853",
  };
  const geocode = { lat: 42.444, lng: -76.485 };

  console.log("Creating Maya…");
  const mayaRes = await nessie.createCustomer({
    first_name: "Maya",
    last_name: "Chen",
    address: ithaca,
  });
  const mayaId = nessie.createdId(mayaRes);
  if (!mayaId) throw new Error("Maya customer id missing");

  console.log("Creating Sam…");
  const samRes = await nessie.createCustomer({
    first_name: "Sam",
    last_name: "Rivera",
    address: ithaca,
  });
  const samId = nessie.createdId(samRes);
  if (!samId) throw new Error("Sam customer id missing");

  const mayaCheckingRes = await nessie.createAccount(mayaId, {
    type: "Checking",
    nickname: "Campus Checking",
    balance: 612.4,
    rewards: 0,
  });
  const mayaSavingsRes = await nessie.createAccount(mayaId, {
    type: "Savings",
    nickname: "Flight Fund",
    balance: 112,
    rewards: 0,
  });
  const samCheckingRes = await nessie.createAccount(samId, {
    type: "Checking",
    nickname: "Campus Checking",
    balance: 84.2,
    rewards: 0,
  });

  const mayaCheckingId = nessie.createdId(mayaCheckingRes);
  const mayaSavingsId = nessie.createdId(mayaSavingsRes);
  const samCheckingId = nessie.createdId(samCheckingRes);
  if (!mayaCheckingId || !mayaSavingsId || !samCheckingId) {
    throw new Error("Account creation failed");
  }

  const merchantNames = [
    "Chipotle",
    "Wegmans",
    "Starbucks",
    "Collegetown Bagels",
    "Amazon",
  ] as const;
  const merchants: Record<string, string> = {};
  for (const name of merchantNames) {
    const m = await nessie.createMerchant({
      name,
      category: name === "Amazon" ? "Retail" : "Food",
      address: ithaca,
      geocode,
    });
    const id = nessie.createdId(m);
    if (id) merchants[name] = id;
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };

  const bills: { payee: string; amount: number; day: number }[] = [
    { payee: "Rent", amount: 450, day: 5 },
    { payee: "Phone", amount: 45, day: 12 },
    { payee: "Spotify", amount: 11, day: 20 },
  ];
  for (const b of bills) {
    const paymentDate = new Date(today);
    paymentDate.setDate(b.day);
    if (paymentDate < today) paymentDate.setMonth(paymentDate.getMonth() + 1);
    await nessie.createBill(mayaCheckingId, {
      status: "pending",
      payee: b.payee,
      nickname: b.payee.toLowerCase(),
      payment_date: iso(paymentDate),
      recurring_date: b.day,
      payment_amount: b.amount,
    });
  }

  for (let w = 0; w < 6; w++) {
    const payDate = addDays(today, -7 - w * 14);
    await nessie.createDeposit(mayaCheckingId, {
      medium: "balance",
      amount: 380,
      description: "Campus job paycheck",
      transaction_date: iso(payDate),
      status: "completed",
    });
  }

  const foodMerchants = [
    merchants.Chipotle,
    merchants.Wegmans,
    merchants["Collegetown Bagels"],
    merchants.Starbucks,
  ].filter(Boolean);

  for (let day = 1; day <= 21; day++) {
    if (day % 2 !== 0) continue;
    const merchant_id = foodMerchants[day % foodMerchants.length];
    await nessie.createPurchase(mayaCheckingId, {
      merchant_id,
      medium: "balance",
      amount: Math.round((45 / 3) * 100) / 100,
      description: "Campus food",
      purchase_date: iso(addDays(today, -day)),
      status: "completed",
    });
  }

  for (let i = 0; i < 4; i++) {
    await nessie.createPurchase(mayaCheckingId, {
      merchant_id: merchants.Starbucks,
      medium: "balance",
      amount: 5.5,
      description: "Coffee",
      purchase_date: iso(addDays(today, -i * 2)),
      status: "completed",
    });
  }

  await nessie.createTransfer(mayaCheckingId, {
    amount: 25,
    description: "Shared Uber — Sam owes Maya",
    transaction_date: iso(addDays(today, -5)),
    status: "completed",
    payee_id: samCheckingId,
  });

  const seed: SeedIds = {
    maya: {
      customerId: mayaId,
      checkingAccountId: mayaCheckingId,
      savingsAccountId: mayaSavingsId,
      name: "Maya Chen",
    },
    sam: {
      customerId: samId,
      checkingAccountId: samCheckingId,
      name: "Sam Rivera",
    },
    merchants,
  };

  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2), "utf8");

  const envPath = resolve(process.cwd(), ".env.local");
  let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  if (/^NESSIE_CUSTOMER_ID=/m.test(env)) {
    env = env.replace(/^NESSIE_CUSTOMER_ID=.*$/m, `NESSIE_CUSTOMER_ID=${mayaId}`);
  } else {
    env += `\nNESSIE_CUSTOMER_ID=${mayaId}\n`;
  }
  writeFileSync(envPath, env, "utf8");

  console.log(`
Seed complete → data/seed-ids.json
  Maya customer:  ${mayaId}
  Sam customer:   ${samId}
  NESSIE_CUSTOMER_ID updated in .env.local
`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

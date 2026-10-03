/**
 * Optional demo seed for Nessie. Run: npx tsx scripts/seed-nessie.ts
 * Requires NESSIE_API_KEY and NESSIE_CUSTOMER_ID in .env.local (load manually).
 */
const BASE = "http://api.nessieisreal.com";

async function main() {
  const key = process.env.NESSIE_API_KEY;
  const customerId = process.env.NESSIE_CUSTOMER_ID;
  if (!key || !customerId) {
    console.error("Set NESSIE_API_KEY and NESSIE_CUSTOMER_ID");
    process.exit(1);
  }

  const q = `?key=${key}`;
  const accountsRes = await fetch(
    `${BASE}/customers/${customerId}/accounts${q}`,
  );
  const accounts = (await accountsRes.json()) as { _id: string }[];
  const accountId = accounts[0]?._id;
  if (!accountId) {
    console.error("No accounts for customer");
    process.exit(1);
  }

  await fetch(`${BASE}/accounts/${accountId}/bills${q}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "pending",
      payee: "Campus Rent",
      nickname: "rent",
      payment_date: "2025-10-07",
      recurring_date: 7,
      payment_amount: 650,
    }),
  });

  console.log("Seeded sample bill on account", accountId);
}

main().catch(console.error);

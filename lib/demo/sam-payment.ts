import { createTransfer, createdId } from "@/lib/nessie";
import { loadSeedIds } from "@/lib/seed-ids";

export const SAM_PAYBACK_AMOUNT = 25;

/** Seeded demo: Sam sends Maya the $25 he owes her (a real Nessie transfer). */
export async function createSamPayment(): Promise<string | null> {
  const seed = loadSeedIds();
  const samChecking = seed?.sam.checkingAccountId;
  const mayaChecking = seed?.maya.checkingAccountId;
  if (!samChecking || !mayaChecking) {
    throw new Error("Seed IDs missing for P2P demo.");
  }

  const res = await createTransfer(samChecking, {
    amount: SAM_PAYBACK_AMOUNT,
    description: "Payback to Maya",
    transaction_date: new Date().toISOString().slice(0, 10),
    status: "completed",
    payee_id: mayaChecking,
  });
  const id = createdId(res);
  if (!id) console.warn("[demo] transfer created without id");
  return id;
}

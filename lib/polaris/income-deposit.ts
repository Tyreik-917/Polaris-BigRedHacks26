import { createDeposit, createdId } from "@/lib/nessie";
import { loadSeedIds } from "@/lib/seed-ids";

export async function depositIncomeToChecking(
  amount: number,
  description: string,
): Promise<{ ok: boolean; depositId: string | null }> {
  const seed = loadSeedIds();
  const checkingId = seed?.maya.checkingAccountId;
  if (!checkingId) {
    return { ok: false, depositId: null };
  }
  try {
    const res = await createDeposit(checkingId, {
      medium: "balance",
      amount,
      description,
      transaction_date: new Date().toISOString().slice(0, 10),
      status: "completed",
    });
    return { ok: true, depositId: createdId(res) };
  } catch {
    return { ok: false, depositId: null };
  }
}

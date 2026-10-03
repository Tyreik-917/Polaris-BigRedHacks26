import { jsonError, rateLimit } from "@/lib/api/http";
import { requireSessionCustomerId } from "@/lib/api/require-customer";
import { getLatestGoalForCustomer } from "@/lib/goals/store";
import { buildProjectionForGoal } from "@/lib/polaris/build-projection";
import { createTransfer, createdId } from "@/lib/nessie";
import { loadSeedIds } from "@/lib/seed-ids";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const limited = rateLimit(request, "move-apply");
  if (limited) return limited;

  const customerId = requireSessionCustomerId(request);
  if (customerId instanceof NextResponse) return customerId;

  const { id: moveId } = await params;
  const goal = await getLatestGoalForCustomer(customerId);
  if (!goal) return jsonError("No active goal.", 404);

  if (moveId !== "receivable_sam") {
    return jsonError("Only P2P receivable move is wired for demo.", 400);
  }

  const seed = loadSeedIds();
  const samChecking = seed?.sam.checkingAccountId;
  const mayaChecking = seed?.maya.checkingAccountId;
  if (!samChecking || !mayaChecking) {
    return jsonError("Seed IDs missing for P2P demo.", 503);
  }

  try {
    const res = await createTransfer(samChecking, {
      amount: 25,
      description: "Payback to Maya",
      transaction_date: new Date().toISOString().slice(0, 10),
      status: "completed",
      payee_id: mayaChecking,
    });
    if (!createdId(res)) {
      console.warn("[demo] transfer created without id");
    }
    const { projection } = await buildProjectionForGoal(goal);
    return NextResponse.json({ projection });
  } catch (e) {
    const { projection } = await buildProjectionForGoal(goal);
    return NextResponse.json({
      projection,
      warning: "Nessie transfer failed; using local projection only.",
    });
  }
}

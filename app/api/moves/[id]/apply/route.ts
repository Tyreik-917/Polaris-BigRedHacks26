import { jsonError, rateLimit } from "@/lib/api/http";
import { requireSessionCustomerId } from "@/lib/api/require-customer";
import { createSamPayment } from "@/lib/demo/sam-payment";
import { getLatestGoalForCustomer } from "@/lib/goals/store";
import { buildProjectionForGoal } from "@/lib/polaris/build-projection";
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

  try {
    await createSamPayment();
  } catch (e) {
    console.error("[moves] apply failed", e);
    return jsonError("Couldn't complete that move. Nothing was changed.", 502);
  }

  try {
    const { projection } = await buildProjectionForGoal(goal);
    return NextResponse.json({ projection });
  } catch (e) {
    console.error("[moves] projection after apply failed", e);
    // The transfer went through; the client will pick up the new ETA on its next poll.
    return NextResponse.json({ projection: null });
  }
}

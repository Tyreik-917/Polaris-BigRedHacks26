import { jsonError, parseJsonBody, rateLimit } from "@/lib/api/http";
import { requireSessionCustomerId } from "@/lib/api/require-customer";
import { demoGuard } from "@/lib/demo/mode";
import { addReportedIncome, getLatestGoalForCustomer } from "@/lib/goals/store";
import { depositIncomeToChecking } from "@/lib/polaris/income-deposit";
import { buildProjectionForGoal } from "@/lib/polaris/build-projection";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  amount: z.number().positive().default(85),
});

/** Stage control: simulate $85 tips (storyboard reroute). */
export async function POST(request: Request) {
  const guard = demoGuard();
  if (guard) return jsonError(guard.error, guard.status);

  const limited = rateLimit(request, "demo-tips", 10, 60_000);
  if (limited) return limited;

  const customerId = requireSessionCustomerId(request);
  if (customerId instanceof NextResponse) return customerId;

  const body = await parseJsonBody(request).catch(() => ({}));
  const parsed = bodySchema.safeParse(body ?? {});
  const amount = parsed.success ? parsed.data.amount : 85;

  const goal = await getLatestGoalForCustomer(customerId);
  if (!goal) return jsonError("Create a goal first.", 404);

  const { projection: before } = await buildProjectionForGoal(goal);
  await addReportedIncome(goal.id, amount, {
    description: "Tips · campus job",
    label: "Tips",
  });
  await depositIncomeToChecking(amount, "Tips · campus job");
  const { projection: after } = await buildProjectionForGoal(goal);

  return NextResponse.json({
    ok: true,
    amount,
    previousEta: before.eta,
    newEta: after.eta,
    projection: after,
    previousWaypoints: before.waypoints,
    accountUpdate: {
      account: "Capital One checking",
      line: `Tips deposited to checking +$${amount.toFixed(2)}`,
    },
  });
}

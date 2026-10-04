import { getGoalAdjustments } from "@/lib/goals/store";
import { loadFinancialSnapshot } from "@/lib/nessie/load-snapshot";
import { projectSavingsRoute } from "@/lib/polaris/savings-route-projection";
import type { Goal, Projection } from "@/lib/types";

export async function buildProjectionForGoal(
  goal: Goal,
  ref: Date = new Date(),
): Promise<{
  projection: Projection;
  snapshot: Awaited<ReturnType<typeof loadFinancialSnapshot>>;
  adjustments: Awaited<ReturnType<typeof getGoalAdjustments>>;
}> {
  const financial = await loadFinancialSnapshot(goal.customerId);
  const adjustments = await getGoalAdjustments(goal.id);

  const mergedSnapshot = {
    ...financial,
    bills: [
      ...financial.bills,
      ...adjustments.extraBills.map((b, i) => ({
        id: `user-bill-${i}`,
        payee: b.payee,
        amount: b.amount,
        dueDate: b.dueDate,
        recurring: false,
      })),
    ],
  };

  const projection = projectSavingsRoute(
    goal,
    mergedSnapshot,
    adjustments,
    ref,
  );

  return { projection, snapshot: mergedSnapshot, adjustments };
}

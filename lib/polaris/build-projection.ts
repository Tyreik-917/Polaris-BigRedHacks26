import {
  getGoalAdjustments,
} from "@/lib/goals/store";
import { loadFinancialSnapshot } from "@/lib/nessie/load-snapshot";
import { project } from "@/lib/projection";
import {
  projectionSnapshotFromFinancial,
} from "@/lib/projection-snapshot";
import { loadSeedIds } from "@/lib/seed-ids";
import type { Goal, Projection } from "@/lib/types";

export async function buildProjectionForGoal(
  goal: Goal,
  ref: Date = new Date(),
): Promise<{ projection: Projection; snapshot: Awaited<ReturnType<typeof loadFinancialSnapshot>> }> {
  const financial = await loadFinancialSnapshot(goal.customerId);
  const adjustments = await getGoalAdjustments(goal.id);
  const seedIds = loadSeedIds() ?? undefined;
  const snap = projectionSnapshotFromFinancial(financial, {
    reportedSpendTotal: adjustments.reportedSpendTotal,
    seedIds,
  });
  const projection = project(goal, snap, ref);
  return { projection, snapshot: financial };
}

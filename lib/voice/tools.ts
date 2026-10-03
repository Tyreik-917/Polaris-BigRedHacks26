import { addReportedSpend, getGoal, saveGoal } from "@/lib/goals/store";
import { buildProjectionForGoal } from "@/lib/polaris/build-projection";
import { parseGoalFromText } from "@/lib/grok/parse-goal";
import { loadSeedIds } from "@/lib/seed-ids";
import type { Goal } from "@/lib/types";
import { randomUUID } from "crypto";

function summary(projection: Awaited<ReturnType<typeof buildProjectionForGoal>>["projection"]) {
  return {
    saved: projection.saved,
    target: projection.goalId,
    eta: projection.eta,
    daysLate: projection.daysLate,
    onTrack: projection.onTrack,
    nextWaypoint: projection.waypoints.find((w) => w.status === "upcoming") ?? null,
  };
}

export async function runVoiceTool(
  customerId: string,
  name: string,
  args: Record<string, unknown>,
  goalId?: string,
): Promise<unknown> {
  switch (name) {
    case "set_goal": {
      const seed = loadSeedIds();
      let name = String(args.name ?? "");
      let targetAmount = Number(args.targetAmount);
      let targetDate = String(args.targetDate ?? "");
      if (!name || !targetAmount || !targetDate) {
        const parsed = await parseGoalFromText(String(args.text ?? name));
        if (!parsed) return { error: "Could not parse goal." };
        name = parsed.label;
        targetAmount = parsed.targetAmount;
        targetDate = parsed.targetDate;
      }
      const goal: Goal = {
        id: randomUUID(),
        customerId,
        name,
        targetAmount,
        targetDate,
        savingsAccountId:
          seed?.maya.savingsAccountId ?? "savings",
        createdAt: new Date().toISOString(),
      };
      await saveGoal(goal);
      const { projection } = await buildProjectionForGoal(goal);
      return { goal, projection: summary(projection) };
    }
    case "get_trip_status": {
      const goal = goalId ? await getGoal(goalId) : null;
      if (!goal) return { error: "No active goal." };
      const { projection } = await buildProjectionForGoal(goal);
      return {
        saved: projection.saved,
        target: goal.targetAmount,
        eta: projection.eta,
        daysLate: projection.daysLate,
        nextWaypoint:
          projection.waypoints.find((w) => w.status === "upcoming") ?? null,
      };
    }
    case "get_next_move": {
      const goal = goalId ? await getGoal(goalId) : null;
      if (!goal) return { error: "No active goal." };
      const { projection } = await buildProjectionForGoal(goal);
      return {
        move: projection.nextMove,
        daysGained: projection.nextMove?.daysGained ?? 0,
      };
    }
    case "report_purchase": {
      const goal = goalId ? await getGoal(goalId) : null;
      if (!goal) return { error: "No active goal." };
      const amount = Number(args.amount);
      const description = String(args.description ?? "Purchase");
      if (!Number.isFinite(amount) || amount <= 0) {
        return { error: "Invalid amount." };
      }
      const { projection: before } = await buildProjectionForGoal(goal);
      await addReportedSpend(goal.id, amount);
      const { projection: after } = await buildProjectionForGoal(goal);
      return {
        description,
        amount,
        previousEta: before.eta,
        newEta: after.eta,
        recoveryMoves: after.recoveryMoves,
      };
    }
    case "apply_move": {
      const goal = goalId ? await getGoal(goalId) : null;
      if (!goal) return { error: "No active goal." };
      const moveId = String(args.moveId ?? "");
      const { projection: before } = await buildProjectionForGoal(goal);
      if (moveId === "receivable_sam") {
        await addReportedSpend(goal.id, -25);
      }
      const { projection: after } = await buildProjectionForGoal(goal);
      return {
        moveId,
        previousEta: before.eta,
        eta: after.eta,
        projection: summary(after),
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

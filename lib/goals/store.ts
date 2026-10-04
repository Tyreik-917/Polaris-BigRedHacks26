import { kvDel, kvGet, kvSet } from "@/lib/store/kv";
import type { Goal } from "@/lib/types";

const goalKey = (id: string) => `goal:${id}`;
const customerGoalsKey = (customerId: string) => `goals:customer:${customerId}`;
const seenTxKey = (goalId: string) => `goal:${goalId}:seen-tx`;
const adjustmentsKey = (goalId: string) => `goal:${goalId}:adjustments`;

export type ReportedIncomeEvent = {
  date: string;
  label: string;
  amount: number;
  description: string;
};

export type ReportedBill = {
  payee: string;
  amount: number;
  dueDate: string;
};

export type GoalAdjustments = {
  reportedSpendTotal: number;
  reportedIncomeTotal: number;
  incomeEvents: ReportedIncomeEvent[];
  extraBills: ReportedBill[];
};

const emptyAdjustments = (): GoalAdjustments => ({
  reportedSpendTotal: 0,
  reportedIncomeTotal: 0,
  incomeEvents: [],
  extraBills: [],
});

export async function saveGoal(goal: Goal): Promise<void> {
  await kvSet(goalKey(goal.id), goal);
  const list =
    (await kvGet<string[]>(customerGoalsKey(goal.customerId))) ?? [];
  if (!list.includes(goal.id)) {
    list.push(goal.id);
    await kvSet(customerGoalsKey(goal.customerId), list);
  }
}

export async function getGoal(id: string): Promise<Goal | null> {
  return kvGet<Goal>(goalKey(id));
}

export async function getLatestGoalForCustomer(
  customerId: string,
): Promise<Goal | null> {
  const list =
    (await kvGet<string[]>(customerGoalsKey(customerId))) ?? [];
  if (list.length === 0) return null;
  const lastId = list[list.length - 1];
  if (!lastId) return null;
  return getGoal(lastId);
}

export async function updateGoal(
  id: string,
  patch: Partial<Goal>,
): Promise<Goal | null> {
  const existing = await getGoal(id);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  await saveGoal(next);
  return next;
}

export async function getSeenTransactionIds(
  goalId: string,
): Promise<string[]> {
  return (await kvGet<string[]>(seenTxKey(goalId))) ?? [];
}

export async function addSeenTransactionIds(
  goalId: string,
  ids: string[],
): Promise<void> {
  const prev = await getSeenTransactionIds(goalId);
  const merged = [...new Set([...prev, ...ids])];
  await kvSet(seenTxKey(goalId), merged);
}

export async function getGoalAdjustments(
  goalId: string,
): Promise<GoalAdjustments> {
  const raw = await kvGet<GoalAdjustments>(adjustmentsKey(goalId));
  if (!raw) return emptyAdjustments();
  return {
    ...emptyAdjustments(),
    ...raw,
    incomeEvents: raw.incomeEvents ?? [],
    extraBills: raw.extraBills ?? [],
  };
}

export async function addReportedSpend(
  goalId: string,
  amount: number,
): Promise<GoalAdjustments> {
  const prev = await getGoalAdjustments(goalId);
  const next = {
    ...prev,
    reportedSpendTotal: prev.reportedSpendTotal + amount,
  };
  await kvSet(adjustmentsKey(goalId), next);
  return next;
}

export async function addReportedIncome(
  goalId: string,
  amount: number,
  meta: { description: string; label?: string },
  ref: Date = new Date(),
): Promise<GoalAdjustments> {
  const prev = await getGoalAdjustments(goalId);
  const date = ref.toISOString().slice(0, 10);
  const label =
    meta.label ??
    (/tip/i.test(meta.description) ? "Tips" : meta.description.slice(0, 40));
  const next: GoalAdjustments = {
    ...prev,
    reportedIncomeTotal: prev.reportedIncomeTotal + amount,
    incomeEvents: [
      ...prev.incomeEvents,
      {
        date,
        label,
        amount,
        description: meta.description,
      },
    ],
  };
  await kvSet(adjustmentsKey(goalId), next);
  return next;
}

export async function addReportedBill(
  goalId: string,
  bill: ReportedBill,
): Promise<GoalAdjustments> {
  const prev = await getGoalAdjustments(goalId);
  const next = {
    ...prev,
    extraBills: [...prev.extraBills, bill],
  };
  await kvSet(adjustmentsKey(goalId), next);
  return next;
}

export async function resetCustomerState(customerId: string): Promise<void> {
  const list =
    (await kvGet<string[]>(customerGoalsKey(customerId))) ?? [];
  for (const id of list) {
    await kvDel(goalKey(id));
    await kvDel(seenTxKey(id));
    await kvDel(adjustmentsKey(id));
  }
  await kvDel(customerGoalsKey(customerId));
}

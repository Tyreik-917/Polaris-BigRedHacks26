import type { Goal, Move, Projection, Waypoint } from "@/lib/types";
import type { ProjectionSnapshot } from "@/lib/projection-snapshot";

const MAX_SIM_DAYS = 180;
const BILL_RESERVE_DAYS = 14;

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const t0 = new Date(`${a}T12:00:00Z`).getTime();
  const t1 = new Date(`${b}T12:00:00Z`).getTime();
  return Math.round((t1 - t0) / 86400000);
}

function isoToday(today: Date): string {
  return today.toISOString().slice(0, 10);
}

type DayLedger = {
  date: string;
  cash: number;
  progress: number;
  billOut: number;
  incomeIn: number;
};

function expandMonthlyBills(
  bills: ProjectionSnapshot["bills"],
  start: string,
  end: string,
): Map<string, { payee: string; amount: number }[]> {
  const map = new Map<string, { payee: string; amount: number }[]>();
  let cursor = start;
  while (cursor <= end) {
    const d = new Date(`${cursor}T12:00:00Z`);
    const dom = d.getUTCDate();
    for (const b of bills) {
      if (b.dayOfMonth === dom) {
        const list = map.get(cursor) ?? [];
        list.push({ payee: b.payee, amount: b.amount });
        map.set(cursor, list);
      }
    }
    cursor = addDays(cursor, 1);
  }
  return map;
}

function expandPaydays(
  snapshot: ProjectionSnapshot,
  start: string,
  end: string,
): Map<string, number> {
  const map = new Map<string, number>();
  const amount = snapshot.paycheckAmount;
  const interval = snapshot.paycheckIntervalDays;
  if (amount <= 0 || interval <= 0) return map;

  let anchor = snapshot.paycheckAnchorDate ?? start;
  while (anchor > start) anchor = addDays(anchor, -interval);
  while (anchor < start) anchor = addDays(anchor, interval);

  let cursor = anchor;
  while (cursor <= end) {
    if (cursor >= start) {
      map.set(cursor, (map.get(cursor) ?? 0) + amount);
    }
    cursor = addDays(cursor, interval);
  }
  return map;
}

function billsDueInWindow(
  fromExclusive: string,
  throughInclusive: string,
  billMap: Map<string, { payee: string; amount: number }[]>,
): number {
  let sum = 0;
  let d = addDays(fromExclusive, 1);
  while (d <= throughInclusive) {
    for (const row of billMap.get(d) ?? []) sum += row.amount;
    d = addDays(d, 1);
  }
  return sum;
}

function simulate(
  goal: Goal,
  snapshot: ProjectionSnapshot,
  today: Date,
): { ledger: DayLedger[]; eta: string | null } {
  const todayStr = isoToday(today);
  const endStr = addDays(
    goal.targetDate,
    60,
  );
  const simEnd = addDays(todayStr, MAX_SIM_DAYS);
  const horizon = simEnd < endStr ? simEnd : endStr;

  const billMap = expandMonthlyBills(snapshot.bills, todayStr, horizon);
  const payMap = expandPaydays(snapshot, todayStr, horizon);

  let cash =
    snapshot.checkingBalance +
    snapshot.savingsBalance -
    snapshot.reportedSpendTotal;

  const ledger: DayLedger[] = [];
  let eta: string | null = null;

  for (let i = 0; i <= MAX_SIM_DAYS; i++) {
    const date = addDays(todayStr, i);
    if (date > horizon) break;

    let incomeIn = 0;
    let billOut = 0;
    if (i > 0) {
      incomeIn = payMap.get(date) ?? 0;
      for (const row of billMap.get(date) ?? []) billOut += row.amount;
      cash += incomeIn - billOut - snapshot.dailySpend;
    }

    const reserveEnd = addDays(date, BILL_RESERVE_DAYS);
    const reserve = billsDueInWindow(date, reserveEnd, billMap);
    const progress = cash - reserve;

    ledger.push({
      date,
      cash: Math.round(cash * 100) / 100,
      progress: Math.round(progress * 100) / 100,
      billOut,
      incomeIn,
    });

    if (eta == null && progress >= goal.targetAmount) {
      eta = date;
    }
  }

  return { ledger, eta };
}

function buildWaypoints(
  goal: Goal,
  ledger: DayLedger[],
  snapshot: ProjectionSnapshot,
  todayStr: string,
  eta: string | null,
): Waypoint[] {
  const candidates: Waypoint[] = [];
  const billMap = expandMonthlyBills(
    snapshot.bills,
    todayStr,
    eta ?? addDays(todayStr, MAX_SIM_DAYS),
  );
  const payMap = expandPaydays(
    snapshot,
    todayStr,
    eta ?? addDays(todayStr, MAX_SIM_DAYS),
  );

  for (const [date, rows] of billMap) {
    if (date > (eta ?? addDays(todayStr, MAX_SIM_DAYS))) continue;
    for (const row of rows) {
      candidates.push({
        date,
        label: row.payee,
        kind: "bill",
        amount: -row.amount,
        status: date < todayStr ? "passed" : "upcoming",
      });
    }
  }

  for (const [date, amount] of payMap) {
    if (date > (eta ?? addDays(todayStr, MAX_SIM_DAYS))) continue;
    candidates.push({
      date,
      label: "Payday",
      kind: "income",
      amount,
      status: date < todayStr ? "passed" : "upcoming",
    });
  }

  const half = goal.targetAmount * 0.5;
  const milestoneDay = ledger.find((l) => l.progress >= half);
  if (milestoneDay) {
    candidates.push({
      date: milestoneDay.date,
      label: "Halfway there",
      kind: "milestone",
      amount: half,
      status: milestoneDay.date < todayStr ? "passed" : "upcoming",
    });
  }

  const passed = candidates
    .filter((w) => w.status === "passed")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2);
  const upcoming = candidates
    .filter((w) => w.status === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date));

  const merged = [...passed, ...upcoming];
  merged.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const picked = merged.slice(0, 6);
  picked.sort((a, b) => a.date.localeCompare(b.date));
  return picked;
}

type MoveAdjust = (s: ProjectionSnapshot) => ProjectionSnapshot;

function scoreMove(
  goal: Goal,
  base: ProjectionSnapshot,
  today: Date,
  baselineEta: string | null,
  adjust: MoveAdjust,
): { daysGained: number; eta: string | null } {
  const adjusted = adjust(base);
  const { eta } = simulate(goal, adjusted, today);
  if (!baselineEta || !eta) return { daysGained: 0, eta };
  const gained = daysBetween(eta, baselineEta);
  return { daysGained: gained, eta };
}

function buildMoveCandidates(
  goal: Goal,
  snapshot: ProjectionSnapshot,
  today: Date,
  baselineEta: string | null,
): Move[] {
  const moves: Move[] = [];
  const avgOrder = snapshot.weeklyFoodSpend / Math.max(1, 3);

  if (snapshot.weeklyFoodSpend > 30) {
    const savings = Math.round(2 * avgOrder);
    const { daysGained } = scoreMove(goal, snapshot, today, baselineEta, (s) => ({
      ...s,
      dailySpend: Math.max(0, s.dailySpend - savings / 7),
    }));
    moves.push({
      id: "food_pace",
      label: "Cook twice this week",
      savings,
      daysGained,
    });
  }

  if (snapshot.receivableAmount >= 5) {
    const amount = snapshot.receivableAmount;
    const { daysGained } = scoreMove(goal, snapshot, today, baselineEta, (s) => ({
      ...s,
      checkingBalance: s.checkingBalance + amount,
      receivableAmount: 0,
    }));
    moves.push({
      id: "receivable_sam",
      label: `Collect the $${amount} ${snapshot.receivableLabel} owes you`,
      savings: amount,
      daysGained,
      action:
        snapshot.samCheckingAccountId && snapshot.seedIds
          ? {
              type: "p2p_request",
              payerId: snapshot.samCheckingAccountId,
              amount,
            }
          : undefined,
    });
  }

  const spotify = snapshot.bills.find((b) =>
    /spotify/i.test(b.payee),
  );
  if (spotify && spotify.amount < 20) {
    const { daysGained } = scoreMove(goal, snapshot, today, baselineEta, (s) => ({
      ...s,
      bills: s.bills.filter((b) => b.id !== spotify.id),
    }));
    moves.push({
      id: "subscription_spotify",
      label: `Pause ${spotify.payee} until ${goal.targetDate}`,
      savings: spotify.amount,
      daysGained,
    });
  }

  if (snapshot.coffeePurchasesPerWeek >= 3) {
    const weeklySave = 6;
    const { daysGained } = scoreMove(goal, snapshot, today, baselineEta, (s) => ({
      ...s,
      dailySpend: Math.max(0, s.dailySpend - weeklySave / 7),
    }));
    moves.push({
      id: "coffee_skip",
      label: "Skip one coffee run a week",
      savings: weeklySave,
      daysGained,
    });
  }

  return moves.sort((a, b) => b.daysGained - a.daysGained);
}

function greedyRecovery(
  goal: Goal,
  snapshot: ProjectionSnapshot,
  today: Date,
  baselineEta: string | null,
  candidates: Move[],
): { moves: Move[]; eta: string | null } {
  const picked: Move[] = [];
  let working = snapshot;
  let eta = baselineEta;

  for (let round = 0; round < 3; round++) {
    const remaining = candidates.filter(
      (c) => !picked.some((p) => p.id === c.id),
    );
    if (remaining.length === 0) break;
    let best: Move | null = null;
    let bestEta: string | null = eta;

    for (const move of remaining) {
      const adjust = moveAdjustForId(move.id, move, working);
      if (!adjust) continue;
      const nextSnap = adjust(working);
      const { eta: nextEta } = simulate(goal, nextSnap, today);
      const gained =
        eta && nextEta ? daysBetween(eta, nextEta) : move.daysGained;
      if (!best || gained > best.daysGained) {
        best = { ...move, daysGained: gained };
        bestEta = nextEta;
      }
    }
    if (!best || best.daysGained <= 0) break;
    picked.push(best);
    const adjust = moveAdjustForId(best.id, best, working);
    if (adjust) working = adjust(working);
    eta = bestEta;
    if (eta && daysBetween(eta, goal.targetDate) <= 0) break;
  }

  return { moves: picked, eta };
}

function moveAdjustForId(
  id: string,
  move: Move,
  s: ProjectionSnapshot,
): MoveAdjust | null {
  switch (id) {
    case "food_pace":
      return (snap) => ({
        ...snap,
        dailySpend: Math.max(0, snap.dailySpend - move.savings / 7),
      });
    case "receivable_sam":
      return (snap) => ({
        ...snap,
        checkingBalance: snap.checkingBalance + move.savings,
        receivableAmount: 0,
      });
    case "subscription_spotify": {
      const spotify = s.bills.find((b) => /spotify/i.test(b.payee));
      if (!spotify) return null;
      return (snap) => ({
        ...snap,
        bills: snap.bills.filter((b) => b.id !== spotify.id),
      });
    }
    case "coffee_skip":
      return (snap) => ({
        ...snap,
        dailySpend: Math.max(0, snap.dailySpend - move.savings / 7),
      });
    default:
      return null;
  }
}

export function project(
  goal: Goal,
  snapshot: ProjectionSnapshot,
  today: Date = new Date(),
): Projection {
  const todayStr = isoToday(today);
  const { ledger, eta } = simulate(goal, snapshot, today);
  const first = ledger[0];
  const saved = first?.progress ?? 0;

  let daysLate = 0;
  let onTrack = false;
  if (eta) {
    daysLate = daysBetween(goal.targetDate, eta);
    onTrack = daysLate <= 0;
  } else {
    daysLate = MAX_SIM_DAYS;
    onTrack = false;
  }

  const waypoints = buildWaypoints(goal, ledger, snapshot, todayStr, eta);
  const moveCandidates = buildMoveCandidates(goal, snapshot, today, eta);
  const nextMove = moveCandidates[0] ?? null;
  const { moves: recoveryMoves, eta: etaWithMoves } = greedyRecovery(
    goal,
    snapshot,
    today,
    eta,
    moveCandidates,
  );

  return {
    goalId: goal.id,
    saved,
    eta,
    daysLate,
    onTrack,
    waypoints,
    nextMove,
    recoveryMoves,
    etaWithMoves,
    computedAt: new Date().toISOString(),
  };
}

/** Extra one-off spend (e.g. new purchase) — returns updated projection. */
export function projectWithExtraSpend(
  goal: Goal,
  snapshot: ProjectionSnapshot,
  extraSpend: number,
  today: Date = new Date(),
): Projection {
  return project(
    goal,
    {
      ...snapshot,
      reportedSpendTotal: snapshot.reportedSpendTotal + extraSpend,
    },
    today,
  );
}

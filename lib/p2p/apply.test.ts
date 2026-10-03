import type { FinancialSnapshot } from "@/lib/nessie/types";
import { describe, expect, it } from "vitest";
import {
  applyP2pCollectionsToSnapshot,
  nessieShowsPaymentReceived,
} from "./apply";
import type { P2pRequestRecord } from "./types";

const baseSnapshot: FinancialSnapshot = {
  fetchedAt: "2025-10-03T12:00:00.000Z",
  customerId: "demo",
  checkingBalance: 300,
  savingsBalance: 140,
  totalLiquid: 440,
  bills: [],
  purchases: [],
  deposits: [],
  transfers: [],
  receivables: [{ name: "Sam", amount: 25, note: "Tickets" }],
  avgDailySpend: 10,
  avgDailyFoodSpend: 8,
  estimatedPaycheckAmount: 450,
  paycheckIntervalDays: 14,
};

const pendingSam: P2pRequestRecord = {
  id: "1",
  key: "sam:25",
  counterpartyName: "Sam",
  amount: 25,
  status: "pending",
  createdAt: "2025-10-01T12:00:00.000Z",
};

describe("applyP2pCollectionsToSnapshot", () => {
  it("boosts savings when a request is marked paid", () => {
    const paid = { ...pendingSam, status: "paid" as const };
    const next = applyP2pCollectionsToSnapshot(baseSnapshot, [paid]);
    expect(next.savingsBalance).toBe(165);
    expect(next.receivables).toHaveLength(0);
  });
});

describe("nessieShowsPaymentReceived", () => {
  it("detects matching incoming transfer after request", () => {
    const snap: FinancialSnapshot = {
      ...baseSnapshot,
      transfers: [
        {
          id: "t-in",
          amount: 25,
          date: "2025-10-03",
          description: "Sam paid back tickets",
          direction: "in",
          counterparty: "Sam",
        },
      ],
    };
    expect(nessieShowsPaymentReceived(pendingSam, snap)).toBe(true);
  });
});

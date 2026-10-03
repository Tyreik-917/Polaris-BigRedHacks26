export type NessieAccount = {
  _id: string;
  type: string;
  balance: number;
  nickname?: string;
};

export type NormalizedBill = {
  id: string;
  payee: string;
  amount: number;
  dueDate: string;
  status?: string;
  recurring?: boolean;
};

export type NormalizedPurchase = {
  id: string;
  amount: number;
  date: string;
  description: string;
  merchantName?: string;
  category?: string;
};

export type NormalizedDeposit = {
  id: string;
  amount: number;
  date: string;
  description?: string;
};

export type NormalizedTransfer = {
  id: string;
  amount: number;
  date: string;
  description: string;
  direction: "in" | "out";
  counterparty?: string;
};

export type ReceivableHint = {
  name: string;
  amount: number;
  note: string;
};

export type FinancialSnapshot = {
  fetchedAt: string;
  customerId: string;
  checkingBalance: number;
  savingsBalance: number;
  totalLiquid: number;
  bills: NormalizedBill[];
  purchases: NormalizedPurchase[];
  deposits: NormalizedDeposit[];
  transfers: NormalizedTransfer[];
  receivables: ReceivableHint[];
  avgDailySpend: number;
  avgDailyFoodSpend: number;
  estimatedPaycheckAmount: number;
  paycheckIntervalDays: number;
};

"use client";

import type { RouteEventRecord } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import { CreditCard, Plus } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  event: RouteEventRecord;
};

export function EventCard({ event }: Props) {
  const incoming =
    event.type === "transfer_received" ||
    event.type === "income_reported" ||
    event.type === "income_expected";
  const title =
    event.type === "transfer_received"
      ? event.description
      : event.type === "income_expected"
        ? "Money on the way"
      : event.type === "income_reported"
        ? "Capital One account updated"
        : event.type === "user_reported"
          ? "Purchase logged"
          : "New purchase detected";
  const subtitle =
    event.type === "income_reported" || event.type === "income_expected"
      ? event.description
      : event.merchant && event.account
        ? `${event.merchant} · ${event.account}`
        : event.description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-[#232b4d] bg-card px-3 py-2.5"
    >
      <div className="flex items-center gap-2.5">
        <div
          className={
            incoming
              ? "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[#3a3015] text-star"
              : "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-offcourse-bg text-offcourse"
          }
        >
          {incoming ? (
            <Plus className="h-4 w-4" aria-hidden />
          ) : (
            <CreditCard className="h-4 w-4" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-ink">{title}</p>
          <p className="text-[13px] text-muted">{subtitle}</p>
        </div>
        {event.amount > 0 && !incoming && (
          <p className="text-[14px] font-bold tabular-nums text-ink">
            −{formatUsd(event.amount)}
          </p>
        )}
        {incoming && (
          <p className="text-[14px] font-bold tabular-nums text-star">
            +{formatUsd(event.amount)}
          </p>
        )}
      </div>
    </motion.div>
  );
}

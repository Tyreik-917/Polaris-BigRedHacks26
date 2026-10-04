"use client";

import type { RouteEventRecord } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import { CreditCard } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  event: RouteEventRecord;
};

export function EventCard({ event }: Props) {
  const incoming =
    event.type === "transfer_received" || event.type === "income_reported";
  const title =
    event.type === "transfer_received"
      ? event.description
      : event.type === "income_reported"
        ? "Capital One account updated"
        : event.type === "user_reported"
          ? "Purchase logged"
          : "New purchase detected";
  const subtitle =
    event.type === "income_reported" && event.account
      ? `${event.description} +${formatUsd(event.amount)} · ${event.account}`
      : event.merchant && event.account
        ? `${event.merchant} · ${event.account}`
        : event.description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-panel text-star">
          <CreditCard className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[15px] font-bold text-ink">{title}</p>
          <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>
        </div>
        {event.amount > 0 && !incoming && (
          <p className="text-[15px] font-medium tabular-nums text-offcourse">
            −{formatUsd(event.amount)}
          </p>
        )}
        {incoming && (
          <p className="text-[15px] font-medium tabular-nums text-star">
            +{formatUsd(event.amount)}
          </p>
        )}
      </div>
    </motion.div>
  );
}

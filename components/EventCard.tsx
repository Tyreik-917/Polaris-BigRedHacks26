"use client";

import type { RouteEventRecord } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import { CreditCard } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  event: RouteEventRecord;
};

export function EventCard({ event }: Props) {
  const title =
    event.type === "transfer_received"
      ? event.description
      : "New purchase detected";
  const subtitle =
    event.merchant && event.account
      ? `${event.merchant} · ${event.account}`
      : event.description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-4 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-panel text-star">
          <CreditCard className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[15px] font-bold text-ink">{title}</p>
          <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>
        </div>
        {event.amount > 0 && event.type !== "transfer_received" && (
          <p className="text-[15px] font-medium tabular-nums text-offcourse">
            −{formatUsd(event.amount)}
          </p>
        )}
        {event.type === "transfer_received" && (
          <p className="text-[15px] font-medium tabular-nums text-star">
            +{formatUsd(event.amount)}
          </p>
        )}
      </div>
    </motion.div>
  );
}

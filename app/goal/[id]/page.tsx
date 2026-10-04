"use client";

import { AccountSummaryCard } from "@/components/AccountSummaryCard";
import { AppHeader } from "@/components/AppHeader";
import { ChatBubble } from "@/components/ChatBubble";
import { PageTransition } from "@/components/PageTransition";
import { PhoneFrame } from "@/components/PhoneFrame";
import { GoalMissing } from "@/components/GoalMissing";
import { useFixtures, useOverview, useProjection } from "@/lib/api";
import { formatMonDay } from "@/lib/format";
import { useStoredGoal } from "@/lib/goal-storage";
import {
  fixtureGoal,
  fixtureGoalSetUserLine,
  fixturePolarisRouteMessage,
} from "@/lib/fixtures";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function GoalSetPage() {
  const params = useParams();
  const id = String(params.id);
  const stored = useStoredGoal(id);
  const goal = stored.goal ?? (useFixtures ? { ...fixtureGoal, id } : null);
  const overview = useOverview(id);
  const projection = useProjection(id);

  if (!stored.hydrated) {
    return (
      <PhoneFrame>
        <div className="flex flex-1 items-center justify-center text-muted">
          Loading…
        </div>
      </PhoneFrame>
    );
  }
  if (!goal || projection.isError) {
    return (
      <GoalMissing
        message={
          projection.error
            ? `Couldn't load your route: ${projection.error.message}`
            : undefined
        }
      />
    );
  }

  return (
    <PhoneFrame>
      <PageTransition>
        <AppHeader />
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <ChatBubble from="user" spokenDurationSec={5}>
            {useFixtures
              ? fixtureGoalSetUserLine
              : `I want to save $${goal.targetAmount} by ${formatMonDay(goal.targetDate)}.`}
          </ChatBubble>

          <ChatBubble from="polaris">
            Destination set. I checked your Capital One accounts, your bills
            and your paydays.
          </ChatBubble>

          {overview.data && projection.data && (
            <AccountSummaryCard
              goal={goal}
              overview={overview.data}
              projection={projection.data}
              loading={overview.isLoading || projection.isLoading}
            />
          )}
          {(overview.isLoading || projection.isLoading) && !overview.data && (
            <AccountSummaryCard
              goal={goal}
              overview={{
                checking: 0,
                savings: 0,
                billsBeforeTarget: 0,
                foodSpending: 0,
              }}
              projection={
                projection.data ?? {
                  goalId: id,
                  saved: 0,
                  eta: null,
                  daysLate: 0,
                  onTrack: true,
                  waypoints: [],
                  nextMove: null,
                  recoveryMoves: [],
                  etaWithMoves: null,
                  computedAt: "",
                }
              }
              loading
            />
          )}

          <ChatBubble from="polaris">{fixturePolarisRouteMessage}</ChatBubble>

          <Link
            href={`/route/${id}`}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-star text-[15px] font-bold text-star-ink"
          >
            Show my star route
            <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
          </Link>
        </div>
      </PageTransition>
    </PhoneFrame>
  );
}

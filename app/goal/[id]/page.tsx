"use client";

import { AccountSummaryCard } from "@/components/AccountSummaryCard";
import { AppHeader } from "@/components/AppHeader";
import { ChatBubble } from "@/components/ChatBubble";
import { PageTransition } from "@/components/PageTransition";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useOverview, useProjection } from "@/lib/api";
import { loadGoal } from "@/lib/goal-storage";
import { fixtureGoal } from "@/lib/fixtures";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

export default function GoalSetPage() {
  const params = useParams();
  const id = String(params.id);
  const goal = useMemo(() => loadGoal(id) ?? { ...fixtureGoal, id }, [id]);
  const overview = useOverview(id);
  const projection = useProjection(id);

  return (
    <PhoneFrame>
      <PageTransition>
        <AppHeader />
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <ChatBubble from="user" spokenDurationSec={4}>
            {`Save $${goal.targetAmount} for ${goal.name} by ${goal.targetDate}`}
          </ChatBubble>

          <ChatBubble from="polaris">
            Destination set. I checked your Capital One accounts to plan the
            route.
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

          <ChatBubble from="polaris">
            Good news: a few small moves get you there on time. Ready for
            directions?
          </ChatBubble>

          <Link
            href={`/route/${id}`}
            className="flex h-[52px] items-center justify-center rounded-xl bg-star text-[16px] font-semibold text-star-ink"
          >
            Show my route
          </Link>
        </div>
      </PageTransition>
    </PhoneFrame>
  );
}

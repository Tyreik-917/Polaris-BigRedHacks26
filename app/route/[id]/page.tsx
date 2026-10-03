"use client";

import { AppHeader } from "@/components/AppHeader";
import { ChatBubble } from "@/components/ChatBubble";
import { Composer } from "@/components/Composer";
import { DemoPanel } from "@/components/DemoPanel";
import { EventCard } from "@/components/EventCard";
import { PageTransition } from "@/components/PageTransition";
import { PhoneFrame } from "@/components/PhoneFrame";
import { RecoveryPlan } from "@/components/RecoveryPlan";
import { StarMap } from "@/components/StarMap";
import { TripStatusBarSpec } from "@/components/TripStatusBarSpec";
import {
  useApplyMove,
  usePostcard,
  useProjection,
  useReportPurchase,
  useRouteEvents,
} from "@/lib/api";
import { fixturePolarisRouteMessage, fixtureGoal } from "@/lib/fixtures";
import { loadGoal } from "@/lib/goal-storage";
import { useUIStore } from "@/lib/store";
import type { RouteEventRecord, Waypoint } from "@/lib/types";
import { startVoiceSession } from "@/lib/voice";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  process.env.NEXT_PUBLIC_DEMO_MODE === "1" ||
  process.env.NEXT_PUBLIC_USE_FIXTURES === "true";

export default function RoutePage() {
  const params = useParams();
  const id = String(params.id);
  const goal = useMemo(() => loadGoal(id) ?? { ...fixtureGoal, id }, [id]);
  const projectionQuery = useProjection(id);
  const projection = projectionQuery.data;
  const postcard = usePostcard(id);
  const applyMove = useApplyMove(id);
  const reportPurchase = useReportPurchase(id);

  const rerouteState = useUIStore((s) => s.rerouteState);
  const setRerouteState = useUIStore((s) => s.setRerouteState);
  const previousWaypoints = useUIStore((s) => s.previousWaypoints);
  const setPreviousWaypoints = useUIStore((s) => s.setPreviousWaypoints);
  const appliedMoveIds = useUIStore((s) => s.appliedMoveIds);
  const setDemoPanelOpen = useUIStore((s) => s.setDemoPanelOpen);
  const pushTranscript = useUIStore((s) => s.pushTranscript);
  const transcript = useUIStore((s) => s.transcript);

  const [since] = useState(() => new Date().toISOString());
  const [activeEvent, setActiveEvent] = useState<RouteEventRecord | null>(null);
  const [previousEta, setPreviousEta] = useState<string | null>(null);
  const [recovered, setRecovered] = useState(false);
  const [composer, setComposer] = useState("");
  const [sheetWaypoint, setSheetWaypoint] = useState<Waypoint | null>(null);
  const handledEvents = useRef(new Set<string>());
  const dPresses = useRef(0);

  const beginReroute = useCallback(
    (event: RouteEventRecord) => {
      if (handledEvents.current.has(event.id)) return;
      handledEvents.current.add(event.id);
      setActiveEvent(event);
      setPreviousEta(event.previousEta);
      setPreviousWaypoints(
        event.previousWaypoints ?? projection?.waypoints ?? null,
      );
      setRerouteState("detecting");
      window.setTimeout(() => setRerouteState("drawing"), 400);
      window.setTimeout(() => setRerouteState("done"), 2800);
      pushTranscript({
        id: crypto.randomUUID(),
        from: "polaris",
        text: "Rerouting. Three moves get you back on course.",
      });
    },
    [projection?.waypoints, pushTranscript, setPreviousWaypoints, setRerouteState],
  );

  useRouteEvents(id, since, (events) => {
    for (const event of events) {
      if (event.type === "transfer_received") {
        setRecovered(true);
        setRerouteState("recovered");
        window.setTimeout(() => setRecovered(false), 3000);
        setActiveEvent(event);
        continue;
      }
      const newEta = event.projection?.eta ?? event.newEta;
      if (newEta && event.previousEta && newEta > event.previousEta) {
        beginReroute({ ...event, newEta });
      }
    }
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "d") return;
      dPresses.current += 1;
      if (dPresses.current >= 3 && DEMO_MODE) {
        setDemoPanelOpen(true);
        dPresses.current = 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDemoPanelOpen]);

  const rerouting =
    rerouteState === "detecting" ||
    rerouteState === "drawing" ||
    rerouteState === "done";

  const mapPhase =
    rerouteState === "detecting"
      ? "fade"
      : rerouteState === "drawing"
        ? "draw"
        : rerouteState === "done" || rerouteState === "recovered"
          ? "done"
          : "none";

  const latestMessage =
    transcript.length > 0
      ? transcript[transcript.length - 1]
      : { from: "polaris" as const, text: fixturePolarisRouteMessage };

  if (!projection) {
    return (
      <PhoneFrame>
        <div className="flex flex-1 items-center justify-center text-muted">
          Plotting route…
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <PageTransition>
        <AppHeader
          rerouting={rerouting && !recovered}
          recovered={recovered}
          onAvatarPress={() => {
            if (DEMO_MODE) setDemoPanelOpen(true);
          }}
        />
        <TripStatusBarSpec
          goal={goal}
          projection={projection}
          rerouting={rerouting}
          previousEta={previousEta}
        />

        {activeEvent && rerouting && (
          <div className="py-2">
            <EventCard event={activeEvent} />
          </div>
        )}

        <StarMap
          goal={goal}
          projection={projection}
          previousWaypoints={previousWaypoints}
          reroutePhase={mapPhase}
          postcardUrl={postcard.data?.url}
          postcardPending={postcard.data?.status !== "ready"}
          nextMove={projection.nextMove}
          onWaypointOpen={setSheetWaypoint}
          onSpeakNextMove={() => {
            void startVoiceSession("chat");
          }}
        />

        <div
          className="flex-1 overflow-y-auto px-4 py-3"
          aria-live="polite"
          aria-atomic="true"
        >
          {latestMessage.from === "user" ? (
            <ChatBubble from="user">{latestMessage.text}</ChatBubble>
          ) : (
            <div className="space-y-3">
              <ChatBubble from="polaris">{latestMessage.text}</ChatBubble>
              {rerouting && projection.recoveryMoves.length > 0 && (
                <RecoveryPlan
                  targetDate={goal.targetDate}
                  moves={projection.recoveryMoves}
                  appliedMoveIds={appliedMoveIds}
                  onApply={(moveId) => applyMove.mutate(moveId)}
                />
              )}
            </div>
          )}
        </div>

        <Composer
          value={composer}
          onChange={setComposer}
          onSubmit={() => {
            const t = composer.trim();
            if (!t) return;
            pushTranscript({
              id: crypto.randomUUID(),
              from: "user",
              text: t,
            });
            reportPurchase.mutate(t);
            setComposer("");
          }}
          onMicToggle={() => {
            void startVoiceSession("report_spending", {
              onReportPurchase: () => reportPurchase.mutate("voice report"),
            });
          }}
        />

        {DEMO_MODE && <DemoPanel goalId={id} />}

        {sheetWaypoint && (
          <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border border-border bg-card p-4 md:px-8">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-heading text-[17px] font-bold text-ink">
                {sheetWaypoint.label}
              </p>
              <button
                type="button"
                className="text-sm text-muted"
                onClick={() => setSheetWaypoint(null)}
              >
                Close
              </button>
            </div>
            <p className="text-[14px] text-muted">{sheetWaypoint.date}</p>
            <p className="mt-2 text-[15px] text-ink">
              {sheetWaypoint.kind === "bill"
                ? `${sheetWaypoint.label}, $${sheetWaypoint.amount}, auto-pays from checking`
                : sheetWaypoint.label}
            </p>
          </div>
        )}
      </PageTransition>
    </PhoneFrame>
  );
}

"use client";

import { AppHeader } from "@/components/AppHeader";
import { ChatBubble } from "@/components/ChatBubble";
import { Composer } from "@/components/Composer";
import { DemoPanel } from "@/components/DemoPanel";
import { EventCard } from "@/components/EventCard";
import { GoalMissing } from "@/components/GoalMissing";
import { PageTransition } from "@/components/PageTransition";
import { PhoneFrame } from "@/components/PhoneFrame";
import { RecoveryPlan } from "@/components/RecoveryPlan";
import { StarMap } from "@/components/StarMap";
import { ThinkingBubble } from "@/components/ThinkingBubble";
import { RouteSplitPane } from "@/components/RouteSplitPane";
import { TripStatusBarSpec } from "@/components/TripStatusBarSpec";
import {
  projectionKey,
  routeChat,
  useFixtures,
  useApplyMove,
  usePostcard,
  useProjection,
  useRouteEvents,
} from "@/lib/api";
import { fixtureGoal, fixturePolarisRouteMessage } from "@/lib/fixtures";
import { WaypointCheckpointSheet } from "@/components/WaypointCheckpointSheet";
import { useStoredGoal } from "@/lib/goal-storage";
import { useUIStore } from "@/lib/store";
import type { Projection, RouteEventRecord, Waypoint } from "@/lib/types";
import { startVoiceSession } from "@/lib/voice";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/** Keeps the thinking indicator up long enough to read as "thinking". */
const MIN_THINKING_MS = 700;

function introMessage(projection: Projection, targetDate: string): string {
  const checkpoints = projection.waypoints.filter(
    (w) => w.kind === "bill" || w.kind === "income",
  ).length;
  const n = checkpoints > 0 ? checkpoints : 4;
  return `Your route has ${n} checkpoints before ${targetDate.slice(5).replace("-", " ")}. Tap any star to see what's due and what's coming in. Tell me about tips, new bills, or anything you buy.`;
}

const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  process.env.NEXT_PUBLIC_DEMO_MODE === "1" ||
  process.env.NEXT_PUBLIC_USE_FIXTURES === "true";

export default function RoutePage() {
  const params = useParams();
  const id = String(params.id);
  const stored = useStoredGoal(id);
  const goal = stored.goal ?? (useFixtures ? { ...fixtureGoal, id } : null);
  const projectionQuery = useProjection(id);
  const projection = projectionQuery.data;
  const postcard = usePostcard(id);
  const applyMove = useApplyMove(id);
  const qc = useQueryClient();

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
  const [rerouteFaster, setRerouteFaster] = useState(false);
  const [thinking, setThinking] = useState(false);
  const thinkingRef = useRef(false);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const handledEvents = useRef(new Set<string>());
  const dPresses = useRef(0);

  const beginReroute = useCallback(
    (
      event: RouteEventRecord,
      announce = true,
      opts?: { faster?: boolean; message?: string },
    ) => {
      if (handledEvents.current.has(event.id)) return;
      handledEvents.current.add(event.id);
      setActiveEvent(event);
      setPreviousEta(event.previousEta);
      setPreviousWaypoints(
        event.previousWaypoints ?? projection?.waypoints ?? null,
      );
      setRerouteFaster(Boolean(opts?.faster));
      setRerouteState("detecting");
      window.setTimeout(() => setRerouteState("drawing"), 400);
      window.setTimeout(() => setRerouteState("done"), 2800);
      if (announce && opts?.message) {
        pushTranscript({
          id: crypto.randomUUID(),
          from: "polaris",
          text: opts.message,
        });
      } else if (announce && !opts?.faster) {
        pushTranscript({
          id: crypto.randomUUID(),
          from: "polaris",
          text: "Rerouting. Three moves get you back on course.",
        });
      }
    },
    [projection?.waypoints, pushTranscript, setPreviousWaypoints, setRerouteState],
  );

  const handleRouteEvent = useCallback(
    (event: RouteEventRecord, announce = true) => {
      const newEta = event.projection?.eta ?? event.newEta;
      const backOnCourse =
        event.type === "transfer_received" &&
        event.projection?.onTrack === true;
      if (backOnCourse) {
        setRecovered(true);
        setRerouteState("recovered");
        setPreviousWaypoints(null);
        window.setTimeout(() => setRecovered(false), 3000);
        setActiveEvent(event);
        return;
      }

      const faster =
        event.type === "income_reported" ||
        (event.previousEta != null &&
          newEta != null &&
          newEta < event.previousEta);

      if (faster && event.projection) {
        beginReroute({ ...event, newEta }, false, { faster: true });
        return;
      }

      const worse =
        event.previousEta != null
          ? newEta == null || newEta > event.previousEta
          : newEta == null;
      if (worse) beginReroute({ ...event, newEta }, announce, { faster: false });
    },
    [beginReroute, setRerouteState],
  );

  useRouteEvents(id, since, (events) => {
    for (const event of events) handleRouteEvent(event);
  });

  const sendChat = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || thinkingRef.current) return;
      thinkingRef.current = true;
      setThinking(true);
      const spokenDurationSec =
        /tip/i.test(text) || /\$85/.test(text) ? 3 : undefined;
      pushTranscript({
        id: crypto.randomUUID(),
        from: "user",
        text,
        spokenDurationSec,
      });

      const turns = useUIStore.getState().transcript.map((m) => ({
        role: m.from === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

      try {
        const [result] = await Promise.all([
          routeChat(id, turns),
          new Promise((r) => setTimeout(r, MIN_THINKING_MS)),
        ]);
        pushTranscript({ id: crypto.randomUUID(), from: "polaris", text: result.reply });
        if (result.projection) {
          qc.setQueryData(projectionKey(id), result.projection);
        }
        // The reply already explains the change, so reroute without a second message.
        if (result.event) handleRouteEvent(result.event, false);
      } catch (e) {
        pushTranscript({
          id: crypto.randomUUID(),
          from: "polaris",
          text:
            e instanceof Error
              ? `I lost signal: ${e.message} Try that again?`
              : "I lost signal for a second. Try that again?",
        });
      } finally {
        thinkingRef.current = false;
        setThinking(false);
      }
    },
    [handleRouteEvent, id, pushTranscript, qc],
  );

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [transcript.length, thinking]);

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

  if (stored.hydrated && (!goal || projectionQuery.isError)) {
    return (
      <GoalMissing
        message={
          projectionQuery.error
            ? `Couldn't load your route: ${projectionQuery.error.message}`
            : undefined
        }
      />
    );
  }

  if (!projection || !goal) {
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
          rerouteFaster={rerouteFaster}
          previousEta={previousEta}
        />

        <RouteSplitPane
          left={
            <StarMap
              goal={goal}
              projection={projection}
              previousWaypoints={previousWaypoints}
              reroutePhase={mapPhase}
              postcardUrl={postcard.data?.url}
              postcardPending={
                !postcard.data || postcard.data.status === "pending"
              }
              nextMove={projection.nextMove}
              onWaypointOpen={setSheetWaypoint}
              onSpeakNextMove={() => {
                void startVoiceSession("chat", {
                  onUtterance: (t) => void sendChat(t),
                });
              }}
            />
          }
          right={
            <div className="flex min-h-0 flex-1 flex-col">
              {activeEvent && rerouting && (
                <div className="shrink-0 border-b border-line px-2 py-2">
                  <EventCard event={activeEvent} />
                </div>
              )}
              <div
                className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
                aria-live="polite"
              >
                <ChatBubble from="polaris">
                  {fixturePolarisRouteMessage || introMessage(projection, goal.targetDate)}
                </ChatBubble>
                {transcript.map((m) => (
                  <ChatBubble
                    key={m.id}
                    from={m.from}
                    spokenDurationSec={m.spokenDurationSec}
                  >
                    {m.text}
                  </ChatBubble>
                ))}
                {thinking && <ThinkingBubble />}
                {rerouting &&
                  !rerouteFaster &&
                  projection.recoveryMoves.length > 0 && (
                  <RecoveryPlan
                    targetDate={goal.targetDate}
                    moves={projection.recoveryMoves}
                    appliedMoveIds={appliedMoveIds}
                    onApply={(moveId) => applyMove.mutate(moveId)}
                  />
                )}
                <div ref={threadEndRef} />
              </div>
              <Composer
                value={composer}
                onChange={setComposer}
                onSubmit={() => {
                  void sendChat(composer);
                  setComposer("");
                }}
                onMicToggle={() => {
                  void startVoiceSession("chat", {
                    onUtterance: (t) => void sendChat(t),
                  });
                }}
                disabled={thinking}
                placeholder="Reply to Polaris…"
              />
            </div>
          }
        />

        {DEMO_MODE && <DemoPanel goalId={id} />}

        {sheetWaypoint && goal && (
          <WaypointCheckpointSheet
            waypoint={sheetWaypoint}
            goal={goal}
            onClose={() => setSheetWaypoint(null)}
          />
        )}
      </PageTransition>
    </PhoneFrame>
  );
}

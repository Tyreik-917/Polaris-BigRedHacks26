"use client";

import { AppHeader } from "@/components/AppHeader";
import { ChatBubble } from "@/components/ChatBubble";
import { Composer } from "@/components/Composer";
import { PageTransition } from "@/components/PageTransition";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ThinkingBubble } from "@/components/ThinkingBubble";
import {
  chatDestination,
  useCreateGoal,
  useFixtures,
  type DestinationChatTurn,
} from "@/lib/api";
import {
  defaultTargetDateMonthsFromNow,
  goalFromQuickPick,
  QUICK_PICK_DESTINATIONS,
} from "@/lib/goals/quick-picks";
import type { ParsedGoalDraft } from "@/lib/types";
import { useUIStore } from "@/lib/store";
import { startVoiceSession } from "@/lib/voice";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { fixtureGoalSetUserLine } from "@/lib/fixtures";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const INTRO = [
  "Welcome to Polaris, where every goal has a route. Tell us where you want to go, and we'll guide you there, one step at a time.",
  "Where to? Tell me what you're saving for, or pick one below.",
];

/** Keeps the thinking indicator up long enough to read as "thinking", not a flicker. */
const MIN_THINKING_MS = 700;

type Message = DestinationChatTurn & { id: string };
type Phase = "idle" | "thinking" | "plotting";

const STORY_SAVE_1000 = "save-1000-dec10";

export function DestinationScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const create = useCreateGoal();
  const reduce = useReducedMotion();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const busyRef = useRef(false);
  const storyStarted = useRef(false);

  const started = messages.length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, phase, reduce]);

  const append = (role: Message["role"], content: string) => {
    const next = [
      ...messagesRef.current,
      { id: crypto.randomUUID(), role, content },
    ];
    messagesRef.current = next;
    setMessages(next);
    return next;
  };

  const finish = () => {
    busyRef.current = false;
    setPhase("idle");
    inputRef.current?.focus();
  };

  const plotRoute = (draft: ParsedGoalDraft) => {
    setPhase("plotting");
    create.mutate(
      { draft },
      {
        onSuccess: (goal) => {
          useUIStore.getState().resetTrip();
          router.push(`/goal/${goal.id}`);
        },
        onError: (e) => {
          append(
            "assistant",
            `I couldn't plot that route (${e instanceof Error ? e.message : "unknown error"}). Want to try again?`,
          );
          finish();
        },
      },
    );
  };

  const send = async (raw: string) => {
    const content = raw.trim();
    if (!content || busyRef.current) return;
    busyRef.current = true;
    setText("");

    const conversation = append("user", content);
    setPhase("thinking");

    try {
      const [{ reply, goal }] = await Promise.all([
        chatDestination(
          conversation.map(({ role, content }) => ({ role, content })),
        ),
        new Promise((r) => setTimeout(r, MIN_THINKING_MS)),
      ]);

      append("assistant", reply);
      if (goal) {
        plotRoute(goal);
        return;
      }
    } catch {
      append("assistant", "I lost signal for a second. Can you say that again?");
    }
    finish();
  };

  useEffect(() => {
    if (searchParams.get("story") !== STORY_SAVE_1000 || storyStarted.current) {
      return;
    }
    storyStarted.current = true;
    if (useFixtures) {
      append("user", fixtureGoalSetUserLine);
      append(
        "assistant",
        "Destination set. I checked your Capital One accounts, your bills and your paydays.",
      );
      plotRoute({
        name: "Save $1,000",
        targetAmount: 1000,
        targetDate: "2026-12-10",
      });
      return;
    }
    void send(fixtureGoalSetUserLine);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when story param is set
  }, [searchParams]);

  const startVoice = () => {
    void startVoiceSession("set_goal", { onUtterance: (t) => void send(t) });
  };

  return (
    <PhoneFrame>
      <PageTransition>
        <AppHeader />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">
            Step 1 of 2
          </p>
          <h1 className="font-heading mt-1 text-[30px] font-bold text-ink">
            Set a destination.
          </h1>

          <div className="mt-6 space-y-3" aria-live="polite">
            {INTRO.map((line, i) => (
              <motion.div
                key={line}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : i * 0.4, duration: 0.25 }}
              >
                <ChatBubble from="polaris">{line}</ChatBubble>
              </motion.div>
            ))}

            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChatBubble from={m.role === "user" ? "user" : "polaris"}>
                  {m.content}
                </ChatBubble>
              </motion.div>
            ))}

            <AnimatePresence>
              {phase === "thinking" && (
                <motion.div
                  key="thinking"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ThinkingBubble />
                </motion.div>
              )}
              {phase === "plotting" && (
                <motion.div
                  key="plotting"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-[14px] text-muted"
                  role="status"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-star" aria-hidden />
                  Checking your accounts and plotting your route…
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!started && (
            <div className="mt-6 flex flex-wrap gap-2">
              {QUICK_PICK_DESTINATIONS.map((pick) => (
                <button
                  key={pick.id}
                  type="button"
                  className="rounded-full border border-border bg-panel px-4 py-2 text-[13px] text-ink"
                  onClick={() => {
                    const goal = goalFromQuickPick(pick);
                    const date =
                      goal?.targetDate ?? defaultTargetDateMonthsFromNow(2);
                    void send(
                      `Save $${pick.targetAmount} for ${pick.label.toLowerCase()} by ${date}`,
                    );
                  }}
                >
                  {pick.chipLabel === "Emergency fund"
                    ? "Emergency cushion"
                    : pick.chipLabel}
                </button>
              ))}
            </div>
          )}

          <div ref={endRef} />
        </div>

        <Composer
          value={text}
          onChange={setText}
          onSubmit={() => void send(text)}
          inputRef={inputRef}
          onMicToggle={startVoice}
          disabled={phase !== "idle"}
          placeholder={
            started ? "Reply to Polaris…" : "Save $400 for flight home by Dec 15…"
          }
        />
      </PageTransition>
    </PhoneFrame>
  );
}

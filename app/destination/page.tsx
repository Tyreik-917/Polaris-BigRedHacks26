"use client";

import { AppHeader } from "@/components/AppHeader";
import { ChatBubble } from "@/components/ChatBubble";
import { Composer } from "@/components/Composer";
import { MicButton } from "@/components/MicButton";
import { PageTransition } from "@/components/PageTransition";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useCreateGoal } from "@/lib/api";
import {
  defaultTargetDateMonthsFromNow,
  goalFromQuickPick,
  QUICK_PICK_DESTINATIONS,
} from "@/lib/goals/quick-picks";
import { startVoiceSession } from "@/lib/voice";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const INTRO = [
  "Welcome to Polaris, where every goal has a route. Tell us where you want to go, and we'll guide you there, one step at a time.",
  "Where to? Tap the mic and say your goal, or pick one below.",
];

export default function DestinationPage() {
  const router = useRouter();
  const create = useCreateGoal();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  const submitGoal = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    create.mutate(
      { text: trimmed },
      {
        onSuccess: (goal) => router.push(`/goal/${goal.id}`),
      },
    );
  };

  return (
    <PhoneFrame>
      <PageTransition>
        <AppHeader />
        <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">
            Step 1 of 2
          </p>
          <h1 className="font-heading mt-1 text-[30px] font-bold text-ink">
            Set a destination.
          </h1>

          <div className="mt-6 space-y-3">
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
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {QUICK_PICK_DESTINATIONS.map((pick) => (
              <button
                key={pick.id}
                type="button"
                className="rounded-full border border-border bg-panel px-4 py-2 text-[13px] text-ink"
                onClick={() => {
                  const goal = goalFromQuickPick(pick);
                  const date =
                    goal?.targetDate ??
                    defaultTargetDateMonthsFromNow(2);
                  const prefilled = `Save $${pick.targetAmount} for ${pick.chipLabel} by ${date}`;
                  setText(prefilled);
                  inputRef.current?.focus();
                }}
              >
                {pick.chipLabel === "Emergency fund"
                  ? "Emergency cushion"
                  : pick.chipLabel}
              </button>
            ))}
          </div>

          <div className="mt-auto flex flex-col items-center gap-2 py-8">
            <MicButton
              size="lg"
              onToggle={() => {
                void startVoiceSession("set_goal", {
                  onGoalCreated: (id) => router.push(`/goal/${id}`),
                });
              }}
            />
            <p className="text-[13px] text-muted">Tap to speak · Grok Voice</p>
          </div>
        </div>

        <Composer
          value={text}
          onChange={setText}
          onSubmit={() => submitGoal(text)}
          inputRef={inputRef}
          onMicToggle={() => {
            void startVoiceSession("set_goal");
          }}
          placeholder="Save $400 for flight home by Dec 15…"
        />
      </PageTransition>
    </PhoneFrame>
  );
}

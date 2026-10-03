"use client";

import { polarisFetch } from "@/lib/api/client-fetch";
import { useUIStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";

type VoiceCallbacks = {
  onGoalCreated?: (goalId: string) => void;
  onReportPurchase?: () => void;
};

let activeSocket: WebSocket | null = null;

function pushUserTranscript(text: string, spokenDurationSec?: number) {
  const msg: ChatMessage = {
    id: crypto.randomUUID(),
    from: "user",
    text,
    spokenDurationSec,
  };
  useUIStore.getState().pushTranscript(msg);
}

function pushPolarisTranscript(text: string) {
  useUIStore.getState().pushTranscript({
    id: crypto.randomUUID(),
    from: "polaris",
    text,
  });
}

export async function startVoiceSession(
  mode: "set_goal" | "report_spending" | "chat" = "set_goal",
  callbacks: VoiceCallbacks = {},
) {
  const store = useUIStore.getState();
  if (store.voiceState === "listening" || store.voiceState === "connecting") {
    stopVoiceSession();
    return;
  }

  store.setVoiceState("connecting");

  const useFallback = process.env.NEXT_PUBLIC_VOICE_MODE === "fallback";

  if (useFallback) {
    await runFallbackVoice(mode, callbacks);
    return;
  }

  try {
    const res = await polarisFetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const data = (await res.json()) as {
      configured?: boolean;
      token?: string;
      realtimeUrl?: string;
    };

    if (!data.configured || !data.token || !data.realtimeUrl) {
      await runFallbackVoice(mode, callbacks);
      return;
    }

    const ws = new WebSocket(data.realtimeUrl, [
      "realtime",
      `openai-insecure-api-key.${data.token}`,
    ]);
    activeSocket = ws;

    ws.onopen = async () => {
      useUIStore.getState().setVoiceState("listening");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        void stream;
      } catch {
        useUIStore.getState().setVoiceState("error");
      }
    };

    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(String(ev.data)) as { type?: string };
        if (payload.type?.includes("response")) {
          useUIStore.getState().setVoiceState("speaking");
        }
      } catch {
        /* ignore */
      }
    };

    ws.onerror = () => {
      useUIStore.getState().setVoiceState("error");
    };

    ws.onclose = () => {
      activeSocket = null;
      useUIStore.getState().setVoiceState("idle");
    };

    void callbacks;
  } catch {
    await runFallbackVoice(mode, callbacks);
  }
}

export function stopVoiceSession() {
  activeSocket?.close();
  activeSocket = null;
  useUIStore.getState().setVoiceState("idle");
}

async function runFallbackVoice(
  mode: "set_goal" | "report_spending" | "chat",
  callbacks: VoiceCallbacks,
) {
  type SpeechRecognitionCtor = new () => {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: ((event: {
      results: { [i: number]: { [j: number]: { transcript?: string } } };
    }) => void) | null;
    onerror: (() => void) | null;
    start: () => void;
  };

  const SpeechRecognition =
    typeof window !== "undefined"
      ? (
          window as unknown as {
            SpeechRecognition?: SpeechRecognitionCtor;
            webkitSpeechRecognition?: SpeechRecognitionCtor;
          }
        ).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor })
          .webkitSpeechRecognition
      : undefined;

  if (!SpeechRecognition) {
    useUIStore.getState().setVoiceState("error");
    return;
  }

  useUIStore.getState().setVoiceState("listening");
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: { results: { [i: number]: { [j: number]: { transcript?: string } } } }) => {
    const text = event.results[0]?.[0]?.transcript?.trim();
    if (!text) return;
    useUIStore.getState().setVoiceState("thinking");
    pushUserTranscript(text, 4);
    void (async () => {
      const res = await polarisFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, mode }),
      });
      if (res.ok) {
        const data = (await res.json()) as { reply?: string };
        if (data.reply) pushPolarisTranscript(data.reply);
      }
      if (mode === "report_spending") callbacks.onReportPurchase?.();
      useUIStore.getState().setVoiceState("idle");
    })();
  };

  recognition.onerror = () => {
    useUIStore.getState().setVoiceState("error");
  };

  recognition.start();
}

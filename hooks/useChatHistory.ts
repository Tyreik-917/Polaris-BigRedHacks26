"use client";

import {
  goalChatStorageKey,
  newChatMessage,
  type ChatMessage,
  type ChatMessageKind,
} from "@/lib/chat/types";
import type { Goal } from "@/lib/goals/types";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_STORED = 80;

export function useChatHistory(goal: Goal | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const storageKeyRef = useRef<string | null>(null);
  const lastRouteFingerprintRef = useRef<string>("");

  useEffect(() => {
    if (!goal) {
      storageKeyRef.current = null;
      setMessages([]);
      setHydrated(true);
      lastRouteFingerprintRef.current = "";
      return;
    }

    const key = goalChatStorageKey(goal);
    if (storageKeyRef.current === key) return;
    storageKeyRef.current = key;
    lastRouteFingerprintRef.current = "";

    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        setMessages(JSON.parse(raw) as ChatMessage[]);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
    setHydrated(true);
  }, [goal]);

  const persist = useCallback((next: ChatMessage[]) => {
    const key = storageKeyRef.current;
    if (!key) return;
    const trimmed = next.slice(-MAX_STORED);
    localStorage.setItem(key, JSON.stringify(trimmed));
    setMessages(trimmed);
  }, []);

  const appendMessage = useCallback(
    (role: ChatMessage["role"], content: string, kind?: ChatMessageKind) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      setMessages((prev) => {
        const next = [...prev, newChatMessage(role, trimmed, kind)];
        const key = storageKeyRef.current;
        if (key) {
          const stored = next.slice(-MAX_STORED);
          localStorage.setItem(key, JSON.stringify(stored));
          return stored;
        }
        return next;
      });
    },
    [],
  );

  const recordRouteUpdate = useCallback(
    (payload: {
      narration: string;
      lines: string[];
      rerouteNote?: string | null;
    }) => {
      const fp = `${payload.rerouteNote ?? ""}::${payload.narration}::${payload.lines.join("\n")}`;
      if (fp === lastRouteFingerprintRef.current) return;
      lastRouteFingerprintRef.current = fp;

      if (payload.rerouteNote) {
        appendMessage(
          "assistant",
          `Reroute update — ${payload.rerouteNote}`,
          "reroute",
        );
      }

      const body = payload.narration.trim() || payload.lines.join("\n\n");
      if (body) {
        appendMessage("assistant", body, "directions");
      }
    },
    [appendMessage],
  );

  const clearHistory = useCallback(() => {
    const key = storageKeyRef.current;
    if (key) localStorage.removeItem(key);
    lastRouteFingerprintRef.current = "";
    setMessages([]);
  }, []);

  return {
    messages,
    hydrated,
    appendMessage,
    recordRouteUpdate,
    clearHistory,
    persist,
  };
}

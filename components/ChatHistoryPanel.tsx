"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VoiceNavigator } from "@/components/VoiceNavigator";
import type { ChatMessage } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  messages: ChatMessage[];
  onSend: (text: string) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  onClear?: () => void;
};

export function ChatHistoryPanel({
  messages,
  onSend,
  loading,
  disabled,
  onClear,
}: Props) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const submit = useCallback(async () => {
    const text = draft.trim();
    if (!text || loading || disabled) return;
    setDraft("");
    await onSend(text);
  }, [draft, disabled, loading, onSend]);

  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Chat with Polaris</CardTitle>
            <CardDescription>
              Your route conversation — scroll back, then ask follow-ups
            </CardDescription>
          </div>
          {messages.length > 0 && onClear && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-xs text-slate-500"
              onClick={onClear}
            >
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          ref={scrollRef}
          className="max-h-64 space-y-3 overflow-y-auto rounded-lg border border-slate-800/80 bg-slate-950/40 p-3"
          aria-live="polite"
          aria-label="Chat history"
        >
          {messages.length === 0 && !loading && (
            <p className="text-sm text-slate-500">
              Directions and reroute updates appear here. Try “What if I pick up
              an extra shift?”
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[92%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-sky-900/50 text-sky-50"
                    : "border border-slate-800 bg-slate-900/80 text-slate-200",
                )}
              >
                {m.role === "assistant" && (
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-sky-400/80">
                    Polaris
                    {m.kind === "reroute" && " · reroute"}
                    {m.kind === "directions" && " · directions"}
                  </p>
                )}
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Polaris is thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a follow-up…"
            disabled={disabled || loading}
            className="border-slate-700 bg-slate-950/50 text-slate-100"
            aria-label="Follow-up question"
          />
          <Button
            type="submit"
            size="icon"
            disabled={disabled || loading || !draft.trim()}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>

        <VoiceNavigator
          mode="chat"
          disabled={disabled || loading}
          onTranscript={(text) => {
            setDraft(text);
            void onSend(text);
          }}
        />
      </CardContent>
    </Card>
  );
}

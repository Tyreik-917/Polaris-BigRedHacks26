"use client";

import { useUIStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Loader2, Mic, Volume2 } from "lucide-react";

type Props = {
  size?: "md" | "lg";
  onToggle?: () => void;
  className?: string;
};

export function MicButton({ size = "md", onToggle, className }: Props) {
  const voiceState = useUIStore((s) => s.voiceState);
  const large = size === "lg";
  const dim = large ? "h-[88px] w-[88px]" : "h-12 w-12";
  const icon = large ? "h-8 w-8" : "h-5 w-5";

  const isError = voiceState === "error";
  const isSpeaking = voiceState === "speaking";
  const isListening = voiceState === "listening";
  const isConnecting = voiceState === "connecting";
  const isThinking = voiceState === "thinking";

  return (
    <button
      type="button"
      aria-label={
        isError
          ? "Microphone unavailable, tap to type instead"
          : voiceState === "idle"
            ? "Start voice input"
            : "Stop voice input"
      }
      onClick={onToggle}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full transition-colors",
        dim,
        isError ? "bg-line text-muted" : "bg-star text-star-ink",
        className,
      )}
    >
      {(isListening || isSpeaking) && (
        <>
          <span className="absolute inset-0 animate-ping rounded-full bg-star/30" />
          <span className="absolute -inset-2 rounded-full border border-star/40" />
        </>
      )}
      {isConnecting && (
        <Loader2 className={cn(icon, "animate-spin")} aria-hidden />
      )}
      {isThinking && (
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-star-ink"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      )}
      {!isConnecting && !isThinking && isSpeaking && (
        <Volume2 className={cn(icon, "relative z-10")} aria-hidden />
      )}
      {!isConnecting && !isThinking && !isSpeaking && (
        <Mic className={cn(icon, "relative z-10")} aria-hidden />
      )}
    </button>
  );
}

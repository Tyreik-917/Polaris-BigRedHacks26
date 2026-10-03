"use client";

import { Button } from "@/components/ui/button";
import { polarisFetch } from "@/lib/api/client-fetch";
import { listenOnceWithWebSpeech } from "@/lib/client/web-speech";
import { realtimeSessionConfig } from "@/lib/grok/voice-agent";
import type { Goal } from "@/lib/goals/types";
import type { UserReportedSpend } from "@/lib/user-reports/types";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type VoiceSessionResponse = {
  configured: boolean;
  token?: string;
  realtimeUrl: string;
  instructions: string;
};

type Props = {
  mode:
    | "set_goal"
    | "read_directions"
    | "read_next_move"
    | "report_spending"
    | "chat";
  narration?: string;
  onTranscript?: (text: string) => void;
  onGoalHeard?: (goal: Goal) => void;
  onSpendingHeard?: (report: UserReportedSpend) => void;
  disabled?: boolean;
};

type MediaCleanup = {
  stream: MediaStream;
  audioContext: AudioContext;
  processor: ScriptProcessorNode;
  source: MediaStreamAudioSourceNode;
};

export function VoiceNavigator({
  mode,
  narration,
  onTranscript,
  onGoalHeard,
  onSpendingHeard,
  disabled,
}: Props) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRef = useRef<MediaCleanup | null>(null);
  const parseInFlightRef = useRef(false);

  const cleanupMedia = useCallback(() => {
    const m = mediaRef.current;
    if (!m) return;
    m.processor.disconnect();
    m.source.disconnect();
    m.stream.getTracks().forEach((t) => t.stop());
    void m.audioContext.close();
    mediaRef.current = null;
  }, []);

  const stop = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    cleanupMedia();
    parseInFlightRef.current = false;
    setActive(false);
    setStatus(null);
  }, [cleanupMedia]);

  const parseTranscript = useCallback(
    (transcript: string) => {
      if (parseInFlightRef.current) return;
      if (
        mode !== "set_goal" &&
        mode !== "report_spending" &&
        mode !== "chat"
      ) {
        return;
      }
      if (mode === "chat") {
        onTranscript?.(transcript);
        setStatus("Question sent.");
        stop();
        return;
      }
      parseInFlightRef.current = true;
      setStatus(`Heard: “${transcript.slice(0, 72)}${transcript.length > 72 ? "…" : ""}”`);
      const endpoint =
        mode === "report_spending"
          ? "/api/spending/report/parse"
          : "/api/goal/parse";
      void polarisFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript }),
      })
        .then((r) => r.json())
        .then((data: { goal?: Goal; report?: UserReportedSpend }) => {
          if (mode === "set_goal" && data.goal) {
            onGoalHeard?.(data.goal);
            setStatus("Goal captured — plotting route.");
            stop();
          } else if (mode === "report_spending" && data.report) {
            onSpendingHeard?.(data.report);
            setStatus("Spending added to your route.");
            stop();
          } else {
            setStatus(
              mode === "report_spending"
                ? "Could not parse spending — try again."
                : "Could not parse a goal — try again.",
            );
            parseInFlightRef.current = false;
          }
        })
        .catch(() => {
          setStatus(
            mode === "report_spending"
              ? "Could not parse spending from speech."
              : "Could not parse goal from speech.",
          );
          parseInFlightRef.current = false;
        });
    },
    [mode, onGoalHeard, onSpendingHeard, stop],
  );

  const startBrowserSpeechFallback = useCallback(async () => {
    setActive(true);
    setStatus(
      mode === "report_spending"
        ? "Listening (browser speech)… describe what you spent."
        : mode === "chat"
          ? "Listening (browser speech)… ask your follow-up."
          : "Listening (browser speech)… state your goal.",
    );
    const text = await listenOnceWithWebSpeech((partial) => {
      setStatus(`Listening… “${partial.slice(0, 60)}${partial.length > 60 ? "…" : ""}”`);
    });
    setActive(false);
    if (!text) {
      setStatus(
        mode === "report_spending"
          ? "Speech recognition unavailable — type your spending instead."
          : mode === "chat"
            ? "Speech recognition unavailable — type your question instead."
            : "Speech recognition unavailable — type your goal instead.",
      );
      return;
    }
    onTranscript?.(text);
    parseTranscript(text);
  }, [mode, onTranscript, parseTranscript]);

  useEffect(() => () => stop(), [stop]);

  const playPcmChunk = useCallback(async (base64: string) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
    }
    const ctx = audioCtxRef.current;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pcm = new Int16Array(bytes.buffer);
    const floats = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) floats[i] = pcm[i] / 32768;
    const buffer = ctx.createBuffer(1, floats.length, 24000);
    buffer.copyToChannel(floats, 0);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
  }, []);

  const start = useCallback(async () => {
    if (disabled) return;
    setStatus("Connecting to Grok Voice…");
    try {
      const res = await polarisFetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, narration }),
      });
      const session = (await res.json()) as VoiceSessionResponse;
      if (!session.configured || !session.token) {
        if (
          mode === "set_goal" ||
          mode === "report_spending" ||
          mode === "chat"
        ) {
          await startBrowserSpeechFallback();
          return;
        }
        setStatus("Voice API not configured — use browser readout below.");
        if (
          (mode === "read_directions" || mode === "read_next_move") &&
          narration &&
          typeof window !== "undefined"
        ) {
          const u = new SpeechSynthesisUtterance(narration);
          window.speechSynthesis.speak(u);
        }
        return;
      }

      const ws = new WebSocket(session.realtimeUrl, [
        `xai-client-secret.${session.token}`,
      ]);
      wsRef.current = ws;

      ws.onopen = () => {
        setActive(true);
        setStatus(
          mode === "set_goal"
            ? "Listening… state your goal."
            : mode === "report_spending"
              ? "Listening… tell me what you spent."
              : mode === "chat"
                ? "Listening… ask your follow-up."
                : mode === "read_next_move"
                ? "Reading next move…"
                : "Reading directions…",
        );
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: realtimeSessionConfig(session.instructions),
          }),
        );
        if ((mode === "read_directions" || mode === "read_next_move") && narration) {
          ws.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text:
                      mode === "read_next_move"
                        ? "Read my next move."
                        : "Read my directions.",
                  },
                ],
              },
            }),
          );
          ws.send(JSON.stringify({ type: "response.create" }));
        }
      };

      ws.onmessage = (ev) => {
        const event = JSON.parse(ev.data as string) as {
          type: string;
          delta?: string;
          transcript?: string;
        };
        if (event.type === "response.output_audio.delta" && event.delta) {
          void playPcmChunk(event.delta);
        }
        if (
          event.type === "conversation.item.input_audio_transcription.updated" &&
          event.transcript
        ) {
          onTranscript?.(event.transcript);
          setStatus(
            `Listening… “${event.transcript.slice(0, 60)}${event.transcript.length > 60 ? "…" : ""}”`,
          );
        }
        if (
          event.type === "conversation.item.input_audio_transcription.completed" &&
          event.transcript
        ) {
          onTranscript?.(event.transcript);
          parseTranscript(event.transcript);
        }
      };

      ws.onerror = () => setStatus("Voice connection error.");
      ws.onclose = () => {
        setActive(false);
        setStatus(null);
        cleanupMedia();
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext({ sampleRate: 24000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(audioContext.destination);
      mediaRef.current = { stream, audioContext, processor, source };
      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm = floatTo16BitPCM(input);
        const b64 = arrayBufferToBase64(pcm);
        ws.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: b64,
          }),
        );
      };
    } catch {
      setStatus("Microphone or voice unavailable.");
      setActive(false);
      cleanupMedia();
    }
  }, [
    cleanupMedia,
    disabled,
    mode,
    narration,
    onTranscript,
    parseTranscript,
    playPcmChunk,
    startBrowserSpeechFallback,
  ]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Button
        type="button"
        variant={active ? "destructive" : "default"}
        disabled={disabled}
        onClick={() => (active ? stop() : void start())}
        className="gap-2"
      >
        {active ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {active
          ? "Stop voice"
          : mode === "set_goal"
            ? "Voice: set goal"
            : mode === "report_spending"
              ? "Voice: report spending"
              : mode === "chat"
                ? "Voice: ask Polaris"
                : mode === "read_next_move"
                  ? "Voice: next move"
                  : "Voice: directions"}
      </Button>
      {(mode === "read_directions" || mode === "read_next_move") && narration && (
        <Button
          type="button"
          variant="outline"
          className="gap-2 border-slate-700"
          onClick={() => {
            const u = new SpeechSynthesisUtterance(narration);
            window.speechSynthesis.speak(u);
          }}
        >
          <Volume2 className="h-4 w-4" />
          Browser readout
        </Button>
      )}
      {status && <p className="text-xs text-slate-400">{status}</p>}
    </div>
  );
}

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function arrayBufferToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

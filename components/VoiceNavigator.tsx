"use client";

import { Button } from "@/components/ui/button";
import type { Goal } from "@/lib/goals/types";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";

type VoiceSessionResponse = {
  configured: boolean;
  token?: string;
  realtimeUrl: string;
  instructions: string;
};

type Props = {
  mode: "set_goal" | "read_directions";
  narration?: string;
  onTranscript?: (text: string) => void;
  onGoalHeard?: (goal: Goal) => void;
  disabled?: boolean;
};

export function VoiceNavigator({
  mode,
  narration,
  onTranscript,
  onGoalHeard,
  disabled,
}: Props) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const stop = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setActive(false);
    setStatus(null);
  }, []);

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
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, narration }),
      });
      const session = (await res.json()) as VoiceSessionResponse;
      if (!session.configured || !session.token) {
        setStatus("Voice API not configured — use text input or speechSynthesis.");
        if (mode === "read_directions" && narration && typeof window !== "undefined") {
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
        setStatus(mode === "set_goal" ? "Listening… state your goal." : "Reading directions…");
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              voice: "eve",
              instructions: session.instructions,
              turn_detection: { type: "server_vad" },
            },
          }),
        );
        if (mode === "read_directions" && narration) {
          ws.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: "user",
                content: [{ type: "input_text", text: "Read my directions." }],
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
          event.type === "conversation.item.input_audio_transcription.completed" &&
          event.transcript
        ) {
          onTranscript?.(event.transcript);
          if (mode === "set_goal") {
            void fetch("/api/goal/parse", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: event.transcript }),
            })
              .then((r) => r.json())
              .then((data: { goal?: Goal }) => {
                if (data.goal) onGoalHeard?.(data.goal);
              })
              .catch(() => undefined);
          }
        }
      };

      ws.onerror = () => setStatus("Voice connection error.");
      ws.onclose = () => {
        setActive(false);
        setStatus(null);
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext({ sampleRate: 24000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(audioContext.destination);
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
    }
  }, [
    disabled,
    mode,
    narration,
    onTranscript,
    onGoalHeard,
    playPcmChunk,
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
        {active ? "Stop voice" : mode === "set_goal" ? "Voice: set goal" : "Voice: directions"}
      </Button>
      {mode === "read_directions" && narration && (
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

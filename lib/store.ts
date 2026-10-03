import type { ChatMessage, Waypoint } from "@/lib/types";
import { create } from "zustand";

export type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

export type RerouteState =
  | "none"
  | "detecting"
  | "drawing"
  | "done"
  | "recovered";

type UIState = {
  voiceState: VoiceState;
  transcript: ChatMessage[];
  rerouteState: RerouteState;
  previousWaypoints: Waypoint[] | null;
  appliedMoveIds: string[];
  demoPanelOpen: boolean;
  setVoiceState: (voiceState: VoiceState) => void;
  pushTranscript: (message: ChatMessage) => void;
  setTranscript: (messages: ChatMessage[]) => void;
  setRerouteState: (state: RerouteState) => void;
  setPreviousWaypoints: (waypoints: Waypoint[] | null) => void;
  markMoveApplied: (moveId: string) => void;
  setDemoPanelOpen: (open: boolean) => void;
  resetReroute: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  voiceState: "idle",
  transcript: [],
  rerouteState: "none",
  previousWaypoints: null,
  appliedMoveIds: [],
  demoPanelOpen: false,
  setVoiceState: (voiceState) => set({ voiceState }),
  pushTranscript: (message) =>
    set((s) => ({ transcript: [...s.transcript, message] })),
  setTranscript: (transcript) => set({ transcript }),
  setRerouteState: (rerouteState) => set({ rerouteState }),
  setPreviousWaypoints: (previousWaypoints) => set({ previousWaypoints }),
  markMoveApplied: (moveId) =>
    set((s) => ({
      appliedMoveIds: s.appliedMoveIds.includes(moveId)
        ? s.appliedMoveIds
        : [...s.appliedMoveIds, moveId],
    })),
  setDemoPanelOpen: (demoPanelOpen) => set({ demoPanelOpen }),
  resetReroute: () =>
    set({
      rerouteState: "none",
      previousWaypoints: null,
    }),
}));

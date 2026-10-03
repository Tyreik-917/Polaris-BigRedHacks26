"use client";

import { VoiceNavigator } from "@/components/VoiceNavigator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { NextMove } from "@/lib/advice/next-move";
import { P2pRequestButton } from "@/components/P2pRequestButton";
import type { P2pAction } from "@/lib/p2p/actions";
import { ChevronRight, Navigation } from "lucide-react";

type Props = {
  moves: NextMove[];
  index: number;
  onIndexChange: (index: number) => void;
  loading?: boolean;
  p2pAction?: P2pAction | null;
  p2pBusy?: boolean;
  showSimulateP2pPaid?: boolean;
  onP2pRequest?: () => void;
  onP2pSimulatePaid?: () => void;
};

export function NextMoveCard({
  moves,
  index,
  onIndexChange,
  loading,
  p2pAction,
  p2pBusy,
  showSimulateP2pPaid,
  onP2pRequest,
  onP2pSimulatePaid,
}: Props) {
  const current = moves[index] ?? null;
  const atEnd = moves.length > 0 && index >= moves.length - 1;

  return (
    <Card className="border-sky-900/60 bg-gradient-to-br from-slate-900/80 to-sky-950/30">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-sky-400">
          <Navigation className="h-4 w-4" aria-hidden />
          <CardTitle className="text-lg">Next move</CardTitle>
        </div>
        <CardDescription>
          One small action at a time — like GPS, not a budget lecture
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <p className="text-sm text-slate-400">Calculating your next turn…</p>
        )}
        {!loading && !current && (
          <p className="text-sm text-slate-400">
            Set a goal and sync accounts to hear your first turn.
          </p>
        )}
        {current && !loading && (
          <>
            <p className="text-base leading-relaxed text-slate-100">{current.text}</p>
            {p2pAction && onP2pRequest && (
              <P2pRequestButton
                action={p2pAction}
                busy={p2pBusy}
                compact
                showSimulatePaid={showSimulateP2pPaid}
                onRequest={onP2pRequest}
                onSimulatePaid={onP2pSimulatePaid}
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <VoiceNavigator
                mode="read_next_move"
                narration={current.text}
                disabled={loading}
              />
              {moves.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 border-slate-700"
                  disabled={atEnd}
                  onClick={() => onIndexChange(Math.min(index + 1, moves.length - 1))}
                >
                  Done — next turn
                  <ChevronRight className="h-3 w-3" />
                </Button>
              )}
              {index > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onIndexChange(index - 1)}
                >
                  Previous
                </Button>
              )}
            </div>
            {moves.length > 1 && (
              <p className="text-xs text-slate-500">
                Turn {index + 1} of {moves.length}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

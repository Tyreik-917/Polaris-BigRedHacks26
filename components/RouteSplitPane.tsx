"use client";

import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "polaris-route-split-pct";
const DEFAULT_PCT = 52;
const MIN_PCT = 28;
const MAX_PCT = 72;

type Props = {
  left: ReactNode;
  right: ReactNode;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
};

function readStoredPct(): number {
  if (typeof window === "undefined") return DEFAULT_PCT;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_PCT;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_PCT;
  return Math.min(MAX_PCT, Math.max(MIN_PCT, n));
}

export function RouteSplitPane({
  left,
  right,
  leftLabel = "Star route",
  rightLabel = "Polaris chat",
  className,
}: Props) {
  const [leftPct, setLeftPct] = useState(DEFAULT_PCT);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLeftPct(readStoredPct());
  }, []);

  const persist = useCallback((pct: number) => {
    window.localStorage.setItem(STORAGE_KEY, String(Math.round(pct)));
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const horizontal = window.matchMedia("(min-width: 768px)").matches;
      const pct = horizontal
        ? ((e.clientX - rect.left) / rect.width) * 100
        : ((e.clientY - rect.top) / rect.height) * 100;
      const next = Math.min(MAX_PCT, Math.max(MIN_PCT, pct));
      setLeftPct(next);
    },
    [dragging],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setLeftPct((current) => {
        persist(current);
        return current;
      });
    },
    [dragging, persist],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex min-h-0 flex-1 flex-col md:flex-row",
        dragging && "select-none",
        className,
      )}
    >
      <section
        className="flex min-h-0 min-w-0 flex-col border-line md:border-r"
        style={{
          flex: `0 0 ${leftPct}%`,
        }}
        aria-label={leftLabel}
      >
        <p className="hidden shrink-0 border-b border-line px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted md:block">
          {leftLabel}
        </p>
        <div className="flex min-h-[240px] min-w-0 flex-1 flex-col md:min-h-0">
          {left}
        </div>
      </section>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(leftPct)}
        aria-valuemin={MIN_PCT}
        aria-valuemax={MAX_PCT}
        aria-label="Resize panels. Drag to give more space to the map or chat."
        tabIndex={0}
        onKeyDown={(e) => {
          const horizontal = window.matchMedia("(min-width: 768px)").matches;
          let delta = 0;
          if (horizontal) {
            if (e.key === "ArrowLeft") delta = 2;
            if (e.key === "ArrowRight") delta = -2;
          } else {
            if (e.key === "ArrowUp") delta = 2;
            if (e.key === "ArrowDown") delta = -2;
          }
          if (delta !== 0) {
            const clamped = Math.min(
              MAX_PCT,
              Math.max(MIN_PCT, leftPct + delta),
            );
            setLeftPct(clamped);
            persist(clamped);
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "relative z-10 flex w-full shrink-0 cursor-row-resize items-center justify-center bg-line/40 py-2 md:w-2 md:cursor-col-resize md:py-0",
          dragging && "bg-star/25",
        )}
      >
        <GripVertical
          className="hidden h-5 w-5 text-muted md:block"
          aria-hidden
        />
        <span className="text-[11px] text-muted md:hidden">Drag to resize</span>
      </div>

      <section
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
        style={{
          flex: `0 0 ${100 - leftPct}%`,
        }}
        aria-label={rightLabel}
      >
        <p className="hidden shrink-0 border-b border-line px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted md:block">
          {rightLabel}
        </p>
        {right}
      </section>
    </div>
  );
}

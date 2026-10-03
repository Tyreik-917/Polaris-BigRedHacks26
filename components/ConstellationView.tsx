"use client";

import ursaMinor from "@/data/constellations/ursa-minor.json";
import {
  litStarCount,
  projectStars,
  type StarRecord,
} from "@/lib/constellation/project";
import { cn } from "@/lib/utils";

type Props = {
  progressPercent: number;
  className?: string;
};

const W = 320;
const H = 320;

export function ConstellationView({ progressPercent, className }: Props) {
  const stars = ursaMinor.stars as StarRecord[];
  const projected = projectStars(stars, W, H);
  const byHip = new Map(projected.map((s) => [s.hip, s]));
  const lit = litStarCount(stars.length, progressPercent);
  const sorted = [...projected].sort((a, b) => a.mag - b.mag);
  const litSet = new Set(sorted.slice(0, lit).map((s) => s.hip));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("mx-auto w-full max-w-sm", className)}
      aria-label="Goal progress constellation"
    >
      <defs>
        <radialGradient id="starGlow">
          <stop offset="0%" stopColor="#e8f4ff" stopOpacity="1" />
          <stop offset="100%" stopColor="#6eb5ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {(ursaMinor.edges as number[][]).map(([a, b], i) => {
        const sa = byHip.get(a);
        const sb = byHip.get(b);
        if (!sa || !sb) return null;
        const active = litSet.has(a) && litSet.has(b);
        return (
          <line
            key={`e-${i}`}
            x1={sa.x}
            y1={sa.y}
            x2={sb.x}
            y2={sb.y}
            stroke={active ? "#8ec5ff" : "#334155"}
            strokeOpacity={active ? 0.85 : 0.25}
            strokeWidth={active ? 1.5 : 1}
          />
        );
      })}
      {projected.map((s) => {
        const on = litSet.has(s.hip);
        const isPolaris = s.hip === ursaMinor.northStarHip;
        return (
          <g key={s.hip}>
            {on && (
              <circle
                cx={s.x}
                cy={s.y}
                r={s.r * 2.2}
                fill="url(#starGlow)"
                opacity={0.7}
              />
            )}
            <circle
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill={on ? (isPolaris ? "#fff7d6" : "#dbeafe") : "#475569"}
              opacity={on ? 1 : 0.35}
            />
            {on && s.name && (
              <text
                x={s.x + 8}
                y={s.y + 4}
                className="fill-slate-300 text-[10px]"
              >
                {isPolaris ? "Polaris" : ""}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

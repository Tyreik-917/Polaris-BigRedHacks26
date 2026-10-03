"use client";

import { postcardProgressStyle } from "@/lib/imagine/postcard-visual";

type Props = {
  /** Top-left of the postcard frame in SVG coordinates */
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  imageUrl?: string | null;
  progressPercent: number;
  pending?: boolean;
  clipPathUrl: string;
  filterUrl?: string;
};

const DEFAULT_W = 72;
const DEFAULT_H = 54;

export function GoalStarPostcardPin({
  x,
  y,
  width = DEFAULT_W,
  height = DEFAULT_H,
  label,
  imageUrl,
  progressPercent,
  pending,
  clipPathUrl,
  filterUrl,
}: Props) {
  const { blurPx, opacity } = postcardProgressStyle(progressPercent);

  return (
    <g
      aria-hidden={!imageUrl && !pending}
      role="img"
      aria-label={
        imageUrl
          ? `Destination postcard: ${label}`
          : pending
            ? `Generating postcard for ${label}`
            : undefined
      }
    >
      <rect
        x={x - 2}
        y={y - 2}
        width={width + 4}
        height={height + 4}
        rx={6}
        fill="#0f172a"
        stroke="#fcd34d"
        strokeWidth={0.75}
        opacity={0.95}
      />
      {imageUrl ? (
        <image
          href={imageUrl}
          x={x}
          y={y}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid slice"
          clipPath={clipPathUrl}
          opacity={opacity}
          filter={blurPx > 0 && filterUrl ? filterUrl : undefined}
        />
      ) : (
        <g clipPath={clipPathUrl}>
          <rect x={x} y={y} width={width} height={height} fill="#1e293b" />
          {pending ? (
            <>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill="#334155"
                opacity={0.5}
              >
                <animate
                  attributeName="opacity"
                  values="0.35;0.65;0.35"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </rect>
              <text
                x={x + width / 2}
                y={y + height / 2 + 3}
                textAnchor="middle"
                className="fill-amber-200/80 text-[8px]"
              >
                Grok Imagine…
              </text>
            </>
          ) : (
            <text
              x={x + width / 2}
              y={y + height / 2 + 3}
              textAnchor="middle"
              className="fill-slate-500 text-[7px]"
            >
              Postcard
            </text>
          )}
        </g>
      )}
      <line
        x1={x + width}
        y1={y + height * 0.45}
        x2={x + width + 10}
        y2={y + height * 0.38}
        stroke="#fde68a"
        strokeWidth={0.75}
        strokeDasharray="2 2"
        opacity={0.7}
      />
    </g>
  );
}

export function postcardBlurFilterDef(filterId: string, blurStd: number) {
  if (blurStd <= 0) return null;
  return (
    <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation={blurStd} />
    </filter>
  );
}

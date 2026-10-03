"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  imageUrl?: string | null;
  progressPercent: number;
};

export function ImaginePostcard({ label, imageUrl, progressPercent }: Props) {
  const blurPx = Math.round((1 - progressPercent) * 12);
  const opacity = 0.45 + progressPercent * 0.55;

  return (
    <Card className="overflow-hidden border-slate-800 bg-slate-900/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Destination postcard</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-950",
            !imageUrl && "flex items-center justify-center",
          )}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={label}
              className="h-full w-full object-cover transition-all duration-700"
              style={{ filter: `blur(${blurPx}px)`, opacity }}
            />
          ) : (
            <p className="px-4 text-center text-sm text-slate-500">
              Grok Imagine preview for &ldquo;{label}&rdquo; appears when API
              key is configured.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

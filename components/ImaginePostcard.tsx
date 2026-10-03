"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { postcardProgressStyle } from "@/lib/imagine/postcard-visual";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Loader2 } from "lucide-react";

type Props = {
  label: string;
  imageUrl?: string | null;
  progressPercent: number;
  pending?: boolean;
};

export function ImaginePostcard({
  label,
  imageUrl,
  progressPercent,
  pending,
}: Props) {
  const { blurPx, opacity } = postcardProgressStyle(progressPercent);

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
            <Image
              src={imageUrl}
              alt={label}
              fill
              unoptimized
              className="object-cover transition-all duration-700"
              style={{ filter: `blur(${blurPx}px)`, opacity }}
              sizes="(max-width: 768px) 100vw, 480px"
            />
          ) : pending ? (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-amber-200/80" />
              <p className="px-4 text-center text-sm">
                Grok Imagine is painting &ldquo;{label}&rdquo;…
              </p>
            </div>
          ) : (
            <p className="px-4 text-center text-sm text-slate-500">
              Grok Imagine preview for &ldquo;{label}&rdquo; appears when the
              image API is configured.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

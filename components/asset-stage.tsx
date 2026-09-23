"use client";

import { useState } from "react";
import { AssetViewer } from "@/components/asset-viewer";
import { cn, formatBytes } from "@/lib/utils";

type Pin = {
  id: string;
  x: number;
  y: number;
  authorId?: string;
  resolvedAt?: string | null;
  comments: {
    id: string;
    body: string;
    createdAt: string;
    editedAt?: string | null;
    authorId: string;
    author: { name: string };
  }[];
};

export type VersionView = {
  id: string;
  versionNumber: number;
  width?: number | null;
  height?: number | null;
  sizeBytes: number;
  pins: Pin[];
};

export function AssetStage({
  latest,
  previous,
  locked,
  currentUserId,
  canModerate,
}: {
  latest: VersionView;
  previous: VersionView | null;
  locked: boolean;
  currentUserId: string;
  canModerate?: boolean;
}) {
  const [mode, setMode] = useState<"now" | "then" | "compare">("now");
  const [split, setSplit] = useState(50);
  const version = mode === "then" && previous ? previous : latest;

  return (
    <div className="space-y-4">
      {previous && (
        <div className="inline-flex rounded-full border border-rule bg-white/70 p-1">
          {(["now", "then", "compare"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]",
                mode === value ? "bg-ink text-paper" : "text-muted",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      )}

      {mode === "compare" && previous ? (
        <div>
          <p className="mb-3 text-sm text-muted">
            Compare v{previous.versionNumber} (Then) with v{latest.versionNumber} (Now). Pins stay on
            their own version — switch to Then or Now to comment.
          </p>
          <div className="relative overflow-hidden rounded-2xl border border-rule bg-ink/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/files/${previous.id}/proxy`} alt="Then" className="block w-full" />
            <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${split}%` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${latest.id}/proxy`}
                alt="Now"
                className="absolute left-0 top-0 h-full max-w-none"
                style={{ width: `${10000 / split}%` }}
              />
            </div>
            <div className="absolute inset-y-0 bg-ink/40" style={{ left: `${split}%`, width: 2 }} />
          </div>
          <input
            type="range"
            min={5}
            max={95}
            value={split}
            onChange={(event) => setSplit(Number(event.target.value))}
            className="mt-3 w-full"
            aria-label="Compare slider"
          />
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">
            Viewing v{version.versionNumber}
            {version.width && version.height ? ` · ${version.width}×${version.height}` : ""} ·{" "}
            {formatBytes(version.sizeBytes)}
            {mode === "then" ? " · comments on this older version only" : ""}
          </p>
          <AssetViewer
            key={version.id}
            imageUrl={`/api/files/${version.id}/proxy`}
            versionId={version.id}
            pins={version.pins}
            canAnnotate={!locked}
            currentUserId={currentUserId}
            canModerate={canModerate}
          />
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function MilestoneActions({
  milestoneId,
  canReopen,
  canStartNext,
}: {
  milestoneId: string;
  canReopen?: boolean;
  canStartNext?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(path: string, action: string) {
    setPending(action);
    setError(null);
    const res = await fetch(path, { method: "POST" });
    const data = await res.json();
    setPending(null);
    if (!res.ok) {
      setError(data.error ?? "Could not update the milestone");
      return;
    }
    router.refresh();
  }

  if (!canReopen && !canStartNext) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canStartNext && (
        <Button
          type="button"
          variant="accent"
          disabled={Boolean(pending)}
          onClick={() => run(`/api/milestones/${milestoneId}/next-round`, "next")}
        >
          {pending === "next" ? "Starting…" : "Start next round"}
        </Button>
      )}
      {canReopen && (
        <Button
          type="button"
          variant="outline"
          disabled={Boolean(pending)}
          onClick={() => run(`/api/milestones/${milestoneId}/reopen`, "reopen")}
        >
          {pending === "reopen" ? "Reopening…" : "Reopen for edits"}
        </Button>
      )}
      {error && <p className="w-full text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}

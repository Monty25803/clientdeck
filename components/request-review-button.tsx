"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RequestReviewButton({
  milestoneId,
  disabled,
  label,
}: {
  milestoneId: string;
  disabled?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/milestones/${milestoneId}/request-review`, { method: "POST" });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not request review");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Button type="button" variant="accent" onClick={request} disabled={disabled || pending}>
        {pending ? "Sending…" : label ?? "Request sign-off"}
      </Button>
      {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}

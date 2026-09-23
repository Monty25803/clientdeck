"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RequestChangesForm({ milestoneId }: { milestoneId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/milestones/${milestoneId}/request-changes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: formData.get("note") }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not send changes");
      return;
    }
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-3 rounded-xl border border-rule bg-paper-2 p-4">
      <div className="space-y-2">
        <Label htmlFor="change-note">Need changes instead?</Label>
        <Textarea
          id="change-note"
          name="note"
          required
          minLength={8}
          placeholder="Tell the studio what to fix before you will sign off."
        />
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Sending…" : "Request changes"}
      </Button>
    </form>
  );
}

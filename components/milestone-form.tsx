"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MilestoneForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        dueAt: formData.get("dueAt") || null,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add milestone");
      return;
    }
    router.refresh();
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="milestone-name">New milestone</Label>
        <Input id="milestone-name" name="name" required placeholder="Brand system, round 2" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="milestone-due">Due (optional)</Label>
        <Input id="milestone-due" name="dueAt" type="datetime-local" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add"}
      </Button>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
    </form>
  );
}

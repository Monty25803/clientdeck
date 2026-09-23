"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProjectForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        clientName: formData.get("clientName"),
        description: formData.get("description"),
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create project");
      return;
    }
    router.push(`/projects/${data.id}`);
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Project name</Label>
        <Input id="name" name="name" required placeholder="Northline rebrand" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="clientName">Client name</Label>
        <Input id="clientName" name="clientName" required placeholder="Northline Co." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Brief</Label>
        <Textarea id="description" name="description" placeholder="What is being delivered?" />
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Open project"}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsForm({
  name,
  primaryColor,
  accentColor,
}: {
  name: string;
  primaryColor: string;
  accentColor: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const payload = new FormData();
    payload.set("name", String(formData.get("name") ?? ""));
    payload.set("primaryColor", String(formData.get("primaryColor") ?? ""));
    payload.set("accentColor", String(formData.get("accentColor") ?? ""));
    const logo = formData.get("logo");
    if (logo instanceof File && logo.size > 0) {
      payload.set("logo", logo);
    }
    const res = await fetch("/api/settings", { method: "POST", body: payload });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save settings");
      return;
    }
    setMessage("Branding updated.");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Studio name</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Primary</Label>
          <Input id="primaryColor" name="primaryColor" type="color" defaultValue={primaryColor} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accentColor">Accent</Label>
          <Input id="accentColor" name="accentColor" type="color" defaultValue={accentColor} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="logo">Logo</Label>
        <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {message && <p className="text-sm text-[var(--ok)]">{message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save branding"}
      </Button>
    </form>
  );
}

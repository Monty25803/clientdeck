"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";

export default function ForgotPage() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setMessage(null);
    setUrl(null);
    const res = await fetch("/api/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formData.get("email") }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not start a reset");
      return;
    }
    setMessage(
      data.mailed
        ? "If that email exists, a reset link is on its way."
        : "If that email exists, copy the reset link below. SMTP is not configured on this instance.",
    );
    setUrl(data.url ?? null);
  }

  return (
    <main className="surface-grid flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-rule bg-white/80 p-8 shadow-card">
        <BrandMark showWordmark />
        <p className="mt-5 text-[11px] uppercase tracking-[0.22em] text-muted">Account</p>
        <h1 className="mt-2 font-serif text-4xl">Reset password</h1>
        <form action={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
        {message && <p className="mt-4 text-sm text-muted">{message}</p>}
        {url && (
          <div className="mt-4 space-y-2">
            <p className="break-all text-sm">{url}</p>
            <CopyButton value={url} />
          </div>
        )}
      </div>
    </main>
  );
}

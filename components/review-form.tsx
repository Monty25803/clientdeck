"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SIGN_OFF_AGREEMENT } from "@/lib/agreement-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/signature-pad";

export function ReviewForm({ milestoneId }: { milestoneId: string }) {
  const router = useRouter();
  const [signature, setSignature] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/milestones/${milestoneId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signerName: formData.get("signerName"),
        agreed: formData.get("agreed") === "on",
        signatureDataUrl: signature,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Sign-off failed");
      return;
    }
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="max-h-48 overflow-auto rounded-xl border border-rule bg-paper-2 p-4 text-sm leading-relaxed">
        {SIGN_OFF_AGREEMENT}
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="agreed" className="mt-1" required />
        <span>I have reviewed the listed versions and agree to this formal sign-off.</span>
      </label>
      <div className="space-y-2">
        <Label htmlFor="signerName">Type your full name</Label>
        <Input id="signerName" name="signerName" required placeholder="Jordan Hale" />
      </div>
      <div className="space-y-2">
        <Label>Optional drawn signature</Label>
        <SignaturePad onChange={setSignature} />
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? "Recording…" : "Approve milestone"}
      </Button>
    </form>
  );
}

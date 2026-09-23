"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/copy-button";

export function InviteForm({
  projectId,
  defaultRole = "CLIENT",
}: {
  projectId?: string;
  defaultRole?: Role;
}) {
  const router = useRouter();
  const [result, setResult] = useState<{ url: string; expiresAt: string; mailed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        role: formData.get("role"),
        projectId,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Invite failed");
      return;
    }
    setResult({ url: data.url, expiresAt: data.expiresAt, mailed: data.mailed });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form action={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
        <div className="space-y-2">
          <Label htmlFor="email">Invite email</Label>
          <Input id="email" name="email" type="email" required placeholder="client@studio.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            defaultValue={defaultRole}
            className="h-11 w-full rounded-xl border border-rule bg-white/70 px-3 text-sm"
          >
            {projectId ? (
              <>
                <option value="CLIENT">Client viewer</option>
                <option value="PROJECT_MANAGER">Project manager</option>
              </>
            ) : (
              <>
                <option value="PROJECT_MANAGER">Project manager</option>
                <option value="ADMIN">Admin</option>
              </>
            )}
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create invite"}
          </Button>
        </div>
      </form>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {result && (
        <div className="rounded-xl border border-dashed border-rule bg-paper-2 p-3 text-sm">
          <p className="font-medium">
            {result.mailed ? "Invite emailed. You can still copy the link." : "Copy this link and send it."}
          </p>
          <p className="mt-1 break-all">{result.url}</p>
          <p className="mt-2 text-xs text-muted">
            Expires {format(new Date(result.expiresAt), "d MMM yyyy")}
          </p>
          <div className="mt-3">
            <CopyButton value={result.url} />
          </div>
        </div>
      )}
    </div>
  );
}

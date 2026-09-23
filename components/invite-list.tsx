"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";

type Invite = {
  id: string;
  email: string;
  role: string;
  url: string;
  expiresAt: Date | string;
  acceptedAt: Date | string | null;
  revokedAt: Date | string | null;
};

export function InviteList({ invites }: { invites: Invite[] }) {
  const router = useRouter();
  const open = invites.filter((invite) => !invite.acceptedAt && !invite.revokedAt);

  if (open.length === 0) {
    return <p className="text-xs text-muted">No open invites.</p>;
  }

  async function revoke(id: string) {
    await fetch(`/api/invites/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {open.map((invite) => (
        <div key={invite.id} className="rounded-xl bg-paper-2 p-3 text-xs">
          <p className="font-semibold">{invite.email}</p>
          <p className="mt-1 text-muted">
            {invite.role.replace("_", " ")} · expires {format(new Date(invite.expiresAt), "d MMM")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <CopyButton value={invite.url} />
            <Button type="button" variant="ghost" size="sm" onClick={() => revoke(invite.id)}>
              Revoke
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

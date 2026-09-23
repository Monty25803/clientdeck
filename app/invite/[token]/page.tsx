import { prisma } from "@/lib/prisma";
import { InviteAcceptForm } from "@/components/invite-accept-form";
import { BrandMark } from "@/components/brand-mark";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-3xl border border-rule bg-white/80 p-8">
          <BrandMark showWordmark />
          <h1 className="mt-5 font-serif text-3xl">Invite unavailable</h1>
          <p className="mt-3 text-sm text-muted">This link is invalid, already used, or expired.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="surface-grid flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-rule bg-white/80 p-8 shadow-card">
        <BrandMark />
        <p className="mt-5 text-[11px] uppercase tracking-[0.22em] text-muted">{invite.organization.name}</p>
        <h1 className="mt-2 font-serif text-4xl">You have been invited</h1>
        <p className="mt-3 text-sm text-muted">
          Join as {invite.role.replace("_", " ").toLowerCase()} to review and approve work in this portal.
        </p>
        <div className="mt-8">
          <InviteAcceptForm token={token} email={invite.email} />
        </div>
      </div>
    </main>
  );
}

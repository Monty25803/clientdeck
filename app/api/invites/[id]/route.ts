import { NextResponse } from "next/server";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { canInvite } from "@/lib/rbac";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canInvite(user.role)) return jsonError("You cannot revoke invites", 403);

  const { id } = await params;
  const invite = await prisma.invite.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!invite) return jsonError("Invite not found", 404);
  if (invite.acceptedAt) return jsonError("This invite was already accepted", 409);

  await prisma.invite.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

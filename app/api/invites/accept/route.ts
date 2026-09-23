import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  token: z.string().min(10),
  name: z.string().trim().min(2).max(80),
  password: z.string().min(8).max(120),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Name and a password of at least 8 characters are required");

  const invite = await prisma.invite.findUnique({ where: { token: parsed.data.token } });
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) {
    return jsonError("This invite is invalid or has expired", 410);
  }

  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  const sessionUser = await currentUser();

  const user = existing
    ? existing
    : await prisma.user.create({
        data: {
          email: invite.email,
          name: parsed.data.name,
          passwordHash: await bcrypt.hash(parsed.data.password, 12),
          role: invite.role,
          organizationId: invite.organizationId,
        },
      });

  if (existing && sessionUser?.id !== existing.id) {
    const matches = await bcrypt.compare(parsed.data.password, existing.passwordHash);
    if (!matches) {
      return jsonError("An account already exists for this email. Sign in with your current password.", 409);
    }
  }

  if (invite.projectId) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: invite.projectId, userId: user.id } },
      update: {},
      create: { projectId: invite.projectId, userId: user.id },
    });
  }

  await prisma.invite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

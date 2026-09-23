import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { addDays } from "date-fns";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";
import { canInvite, getAccessibleProject } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { sendMail } from "@/lib/mail";
import { mailConfigured } from "@/lib/env";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: z.nativeEnum(Role),
  projectId: z.string().optional(),
});

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const projectId = new URL(request.url).searchParams.get("projectId");
  const invites = await prisma.invite.findMany({
    where: {
      organizationId: user.organizationId,
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    invites: invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      url: absoluteUrl(`/invite/${invite.token}`),
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      revokedAt: invite.revokedAt,
    })),
  });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canInvite(user.role)) return jsonError("You cannot invite people", 403);
  const limited = rateLimit(clientKey(request, `invite:${user.id}`), 20, 15 * 60 * 1000);
  if (!limited.ok) return jsonError("Too many invites. Try again shortly.", 429);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("A valid email and role are required");

  if (parsed.data.role === "ADMIN" && user.role !== "ADMIN") {
    return jsonError("Only admins can invite other admins", 403);
  }

  if (parsed.data.role === "CLIENT" && !parsed.data.projectId) {
    return jsonError("Client viewers must be invited to a project");
  }

  if (parsed.data.projectId) {
    const project = await getAccessibleProject(user, parsed.data.projectId);
    if (!project) return jsonError("Project not found", 404);
  }

  const token = randomBytes(24).toString("hex");
  const invite = await prisma.invite.create({
    data: {
      email: parsed.data.email,
      token,
      role: parsed.data.role,
      projectId: parsed.data.projectId,
      organizationId: user.organizationId,
      invitedById: user.id,
      expiresAt: addDays(new Date(), 14),
    },
  });

  if (parsed.data.projectId) {
    await logActivity({
      projectId: parsed.data.projectId,
      actorId: user.id,
      type: "MEMBER_INVITED",
      payload: { email: parsed.data.email, role: parsed.data.role },
    });
  }

  const url = absoluteUrl(`/invite/${token}`);
  const mailed = await sendMail({
    to: parsed.data.email,
    subject: `You are invited to ${user.name ? "a ClientDeck project" : "ClientDeck"}`,
    text: `Join this ClientDeck portal:\n\n${url}\n\nThis link expires in 14 days.`,
  });

  return NextResponse.json({
    id: invite.id,
    url,
    expiresAt: invite.expiresAt,
    mailed: mailed.sent,
    mailConfigured: mailConfigured(),
  });
}

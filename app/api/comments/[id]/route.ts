import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getAccessibleProject, isAgency } from "@/lib/rbac";

const patchSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Comment cannot be empty");

  const { id } = await params;
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      annotation: { include: { version: { include: { asset: { include: { milestone: true } } } } } },
    },
  });
  if (!comment) return jsonError("Comment not found", 404);
  if (comment.annotation.version.asset.milestone.status === "APPROVED") {
    return jsonError("Approved milestones are locked", 409);
  }

  const project = await getAccessibleProject(user, comment.annotation.version.asset.milestone.projectId);
  if (!project) return jsonError("Access denied", 403);
  if (comment.authorId !== user.id) return jsonError("You can only edit your own comments", 403);

  const updated = await prisma.comment.update({
    where: { id },
    data: { body: parsed.data.body, editedAt: new Date() },
    include: { author: { select: { name: true } } },
  });
  return NextResponse.json({ comment: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      annotation: { include: { version: { include: { asset: { include: { milestone: true } } } } } },
    },
  });
  if (!comment) return jsonError("Comment not found", 404);
  if (comment.annotation.version.asset.milestone.status === "APPROVED") {
    return jsonError("Approved milestones are locked", 409);
  }

  const project = await getAccessibleProject(user, comment.annotation.version.asset.milestone.projectId);
  if (!project) return jsonError("Access denied", 403);
  if (comment.authorId !== user.id && !isAgency(user.role)) {
    return jsonError("You can only delete your own comments", 403);
  }

  await prisma.comment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

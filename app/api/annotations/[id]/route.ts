import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getAccessibleProject, isAgency } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";

const patchSchema = z.object({
  resolved: z.boolean(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid pin update");

  const { id } = await params;
  const annotation = await prisma.annotation.findUnique({
    where: { id },
    include: { version: { include: { asset: { include: { milestone: true } } } } },
  });
  if (!annotation) return jsonError("Pin not found", 404);
  if (annotation.version.asset.milestone.status === "APPROVED") {
    return jsonError("Approved milestones are locked", 409);
  }

  const project = await getAccessibleProject(user, annotation.version.asset.milestone.projectId);
  if (!project) return jsonError("Access denied", 403);
  if (annotation.authorId !== user.id && !isAgency(user.role)) {
    return jsonError("You can only resolve your own pins", 403);
  }

  const updated = await prisma.annotation.update({
    where: { id },
    data: parsed.data.resolved
      ? { resolvedAt: new Date(), resolvedById: user.id }
      : { resolvedAt: null, resolvedById: null },
  });

  if (parsed.data.resolved) {
    await logActivity({
      projectId: annotation.version.asset.milestone.projectId,
      actorId: user.id,
      type: "COMMENT_RESOLVED",
      payload: { assetId: annotation.version.assetId, annotationId: annotation.id },
    });
  }

  return NextResponse.json({
    annotation: {
      id: updated.id,
      resolvedAt: updated.resolvedAt,
      resolvedById: updated.resolvedById,
    },
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const annotation = await prisma.annotation.findUnique({
    where: { id },
    include: { version: { include: { asset: { include: { milestone: true } } } } },
  });
  if (!annotation) return jsonError("Pin not found", 404);
  if (annotation.version.asset.milestone.status === "APPROVED") {
    return jsonError("Approved milestones are locked", 409);
  }

  const project = await getAccessibleProject(user, annotation.version.asset.milestone.projectId);
  if (!project) return jsonError("Access denied", 403);
  if (annotation.authorId !== user.id && !isAgency(user.role)) {
    return jsonError("You can only remove your own pins", 403);
  }

  await prisma.annotation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getAccessibleProject } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { notifyProjectMembers } from "@/lib/notify";
import { absoluteUrl } from "@/lib/utils";

const schema = z.object({
  annotationId: z.string(),
  body: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Comment cannot be empty");

  const annotation = await prisma.annotation.findUnique({
    where: { id: parsed.data.annotationId },
    include: { version: { include: { asset: { include: { milestone: true } } } } },
  });
  if (!annotation) return jsonError("Pin not found", 404);
  if (annotation.version.asset.milestone.status === "APPROVED") {
    return jsonError("Approved milestones are locked", 409);
  }

  const project = await getAccessibleProject(user, annotation.version.asset.milestone.projectId);
  if (!project) return jsonError("Access denied", 403);

  const comment = await prisma.comment.create({
    data: {
      annotationId: annotation.id,
      authorId: user.id,
      body: parsed.data.body,
    },
    include: { author: { select: { name: true } } },
  });

  const projectId = annotation.version.asset.milestone.projectId;
  await logActivity({
    projectId,
    actorId: user.id,
    type: "COMMENT_ADDED",
    payload: { assetId: annotation.version.assetId, annotationId: annotation.id },
  });

  await notifyProjectMembers({
    projectId,
    actorId: user.id,
    subject: `New comment on ${annotation.version.asset.name}`,
    text: `${user.name}: ${parsed.data.body}\n\n${absoluteUrl(`/projects/${projectId}/assets/${annotation.version.assetId}`)}`,
  });

  return NextResponse.json({ comment });
}

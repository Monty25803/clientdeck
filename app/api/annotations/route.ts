import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getAccessibleProject } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { notifyProjectMembers } from "@/lib/notify";
import { absoluteUrl } from "@/lib/utils";

const schema = z.object({
  versionId: z.string(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  body: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid pin");

  const version = await prisma.assetVersion.findUnique({
    where: { id: parsed.data.versionId },
    include: { asset: { include: { milestone: true } } },
  });
  if (!version) return jsonError("Version not found", 404);
  if (version.asset.milestone.status === "APPROVED") {
    return jsonError("Approved milestones are locked", 409);
  }

  const project = await getAccessibleProject(user, version.asset.milestone.projectId);
  if (!project) return jsonError("Access denied", 403);

  const annotation = await prisma.annotation.create({
    data: {
      versionId: version.id,
      authorId: user.id,
      x: parsed.data.x,
      y: parsed.data.y,
      comments: parsed.data.body
        ? { create: { authorId: user.id, body: parsed.data.body } }
        : undefined,
    },
    include: {
      comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });

  if (parsed.data.body) {
    await logActivity({
      projectId: version.asset.milestone.projectId,
      actorId: user.id,
      type: "COMMENT_ADDED",
      payload: { assetId: version.assetId, annotationId: annotation.id },
    });
    await notifyProjectMembers({
      projectId: version.asset.milestone.projectId,
      actorId: user.id,
      subject: `New pin on ${version.asset.name}`,
      text: `${user.name}: ${parsed.data.body}\n\n${absoluteUrl(`/projects/${version.asset.milestone.projectId}/assets/${version.assetId}`)}`,
    });
  }

  return NextResponse.json({ annotation });
}

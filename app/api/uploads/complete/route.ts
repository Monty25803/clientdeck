import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { canUpload, getAccessibleProject } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { ALLOWED_IMAGE_TYPES } from "@/lib/upload-constants";

const schema = z.object({
  milestoneId: z.string(),
  assetId: z.string().optional(),
  name: z.string().trim().min(1).max(160),
  key: z.string().min(3),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canUpload(user.role)) return jsonError("You cannot upload assets", 403);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid asset payload");
  if (!ALLOWED_IMAGE_TYPES.includes(parsed.data.mimeType)) {
    return jsonError("Only image files are allowed");
  }
  if (!parsed.data.key.startsWith("assets/")) {
    return jsonError("Invalid storage key");
  }

  const milestone = await prisma.milestone.findUnique({
    where: { id: parsed.data.milestoneId },
    include: { project: true, assets: { include: { versions: true } } },
  });
  if (!milestone) return jsonError("Milestone not found", 404);
  if (milestone.status === "APPROVED") return jsonError("Approved milestones are locked", 409);

  const project = await getAccessibleProject(user, milestone.projectId);
  if (!project) return jsonError("Access denied", 403);

  const asset = parsed.data.assetId
    ? await prisma.asset.findFirst({
        where: { id: parsed.data.assetId, milestoneId: milestone.id },
        include: { versions: true },
      })
    : await prisma.asset.create({
        data: { milestoneId: milestone.id, name: parsed.data.name },
        include: { versions: true },
      });

  if (!asset) return jsonError("Asset not found", 404);

  const last = await prisma.assetVersion.aggregate({
    where: { assetId: asset.id },
    _max: { versionNumber: true },
  });
  const versionNumber = (last._max.versionNumber ?? 0) + 1;
  const version = await prisma.assetVersion.create({
    data: {
      assetId: asset.id,
      versionNumber,
      storageKey: parsed.data.key,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      width: parsed.data.width,
      height: parsed.data.height,
      uploadedById: user.id,
    },
  });

  await logActivity({
    projectId: milestone.projectId,
    actorId: user.id,
    type: versionNumber === 1 ? "ASSET_UPLOADED" : "VERSION_UPLOADED",
    payload: { assetId: asset.id, name: asset.name, versionNumber },
  });

  return NextResponse.json({ assetId: asset.id, versionId: version.id, versionNumber });
}

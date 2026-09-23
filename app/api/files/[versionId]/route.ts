import { NextResponse } from "next/server";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getAccessibleProject } from "@/lib/rbac";
import { presignGet } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { versionId } = await params;
  const version = await prisma.assetVersion.findUnique({
    where: { id: versionId },
    include: { asset: { include: { milestone: true } } },
  });
  if (!version) return jsonError("File not found", 404);

  const project = await getAccessibleProject(user, version.asset.milestone.projectId);
  if (!project) return jsonError("Unauthorized", 401);

  const signed = await presignGet(version.storageKey);
  return NextResponse.json(signed);
}

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getAccessibleProject } from "@/lib/rbac";
import { bucket, internalS3 } from "@/lib/storage";

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

  const object = await internalS3().send(
    new GetObjectCommand({
      Bucket: bucket(),
      Key: version.storageKey,
    }),
  );

  const bytes = await object.Body?.transformToByteArray();
  if (!bytes) return jsonError("File missing", 404);

  return new NextResponse(Buffer.from(bytes) as unknown as BodyInit, {
    headers: {
      "Content-Type": version.mimeType,
      "Cache-Control": "private, max-age=60",
    },
  });
}

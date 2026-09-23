import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { canApprove, getAccessibleProject } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { SIGN_OFF_AGREEMENT, hashAgreement } from "@/lib/agreement";
import { objectKey, putObject } from "@/lib/storage";
import { notifyProjectMembers } from "@/lib/notify";
import { absoluteUrl } from "@/lib/utils";

const schema = z.object({
  signerName: z.string().trim().min(2).max(120),
  agreed: z.literal(true),
  signatureDataUrl: z.string().optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canApprove(user.role)) return jsonError("Only client viewers can approve milestones", 403);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Type your full name and accept the sign-off terms");

  const { id } = await params;
  const milestone = await prisma.milestone.findUnique({
    where: { id },
    include: { assets: { include: { versions: { orderBy: { versionNumber: "asc" } } } } },
  });
  if (!milestone) return jsonError("Milestone not found", 404);
  if (milestone.status === "APPROVED") return jsonError("This milestone is already approved", 409);
  if (milestone.status !== "IN_REVIEW") return jsonError("The studio has not requested sign-off yet", 409);

  const project = await getAccessibleProject(user, milestone.projectId);
  if (!project) return jsonError("Access denied", 403);

  const versionSnapshot = milestone.assets.map((asset) => {
    const latest = asset.versions.at(-1);
    return { assetId: asset.id, assetName: asset.name, versionId: latest?.id, versionNumber: latest?.versionNumber };
  });

  let signatureKey: string | undefined;
  if (parsed.data.signatureDataUrl?.startsWith("data:image/png;base64,")) {
    const buffer = Buffer.from(parsed.data.signatureDataUrl.split(",")[1] ?? "", "base64");
    signatureKey = objectKey("signatures", "signature.png");
    await putObject(signatureKey, buffer, "image/png");
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");

  await prisma.$transaction([
    prisma.approval.create({
      data: {
        milestoneId: id,
        userId: user.id,
        signerName: parsed.data.signerName,
        signatureKey,
        agreementText: SIGN_OFF_AGREEMENT,
        agreementHash: hashAgreement(SIGN_OFF_AGREEMENT),
        versionSnapshot,
        ipAddress,
        userAgent: request.headers.get("user-agent"),
      },
    }),
    prisma.milestone.update({
      where: { id },
      data: { status: "APPROVED" },
    }),
  ]);

  await logActivity({
    projectId: milestone.projectId,
    actorId: user.id,
    type: "MILESTONE_APPROVED",
    payload: { milestoneId: id, name: milestone.name, signerName: parsed.data.signerName },
  });

  await notifyProjectMembers({
    projectId: milestone.projectId,
    actorId: user.id,
    roles: ["ADMIN", "PROJECT_MANAGER"],
    subject: `${project.name}: ${milestone.name} approved`,
    text: `${parsed.data.signerName} approved ${milestone.name} in ${project.name}.\n\nAudit: ${absoluteUrl(`/projects/${project.id}/milestones/${id}/audit`)}`,
  });

  return NextResponse.json({ ok: true });
}

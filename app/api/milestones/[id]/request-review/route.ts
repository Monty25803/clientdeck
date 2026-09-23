import { NextResponse } from "next/server";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getAccessibleProject, isAgency } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { canRequestSignOff } from "@/lib/milestone";
import { notifyProjectMembers } from "@/lib/notify";
import { absoluteUrl } from "@/lib/utils";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isAgency(user.role)) return jsonError("Only the studio can request sign-off", 403);

  const { id } = await params;
  const milestone = await prisma.milestone.findUnique({
    where: { id },
    include: { assets: { include: { versions: true } } },
  });
  if (!milestone) return jsonError("Milestone not found", 404);
  if (!canRequestSignOff(milestone.status)) {
    return jsonError(milestone.status === "APPROVED" ? "Already approved" : "Sign-off is already waiting on the client", 409);
  }
  if (milestone.assets.every((asset) => asset.versions.length === 0)) {
    return jsonError("Upload at least one asset before requesting sign-off");
  }

  const project = await getAccessibleProject(user, milestone.projectId);
  if (!project) return jsonError("Access denied", 403);

  await prisma.milestone.update({
    where: { id },
    data: { status: "IN_REVIEW" },
  });

  await logActivity({
    projectId: milestone.projectId,
    actorId: user.id,
    type: "REVIEW_REQUESTED",
    payload: { milestoneId: id, name: milestone.name },
  });

  await notifyProjectMembers({
    projectId: milestone.projectId,
    actorId: user.id,
    roles: ["CLIENT"],
    subject: `${project.name}: ${milestone.name} is ready for sign-off`,
    text: `${user.name} asked you to review ${milestone.name} in ${project.name}.\n\n${absoluteUrl(`/review/${milestone.id}`)}`,
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getAccessibleProject, isAgency } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { notifyProjectMembers } from "@/lib/notify";
import { absoluteUrl } from "@/lib/utils";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isAgency(user.role)) return jsonError("Only the studio can reopen a milestone", 403);

  const { id } = await params;
  const milestone = await prisma.milestone.findUnique({ where: { id } });
  if (!milestone) return jsonError("Milestone not found", 404);
  if (milestone.status !== "APPROVED") return jsonError("Only approved milestones can be reopened", 409);

  const project = await getAccessibleProject(user, milestone.projectId);
  if (!project) return jsonError("Access denied", 403);

  await prisma.milestone.update({
    where: { id },
    data: { status: "DRAFT" },
  });

  await logActivity({
    projectId: milestone.projectId,
    actorId: user.id,
    type: "MILESTONE_REOPENED",
    payload: { milestoneId: id, name: milestone.name },
  });

  await notifyProjectMembers({
    projectId: milestone.projectId,
    actorId: user.id,
    subject: `${project.name}: ${milestone.name} was reopened`,
    text: `${user.name} reopened ${milestone.name} in ${project.name}. Previous sign-off stays on the audit page.\n\n${absoluteUrl(`/projects/${project.id}`)}`,
  });

  return NextResponse.json({ ok: true });
}

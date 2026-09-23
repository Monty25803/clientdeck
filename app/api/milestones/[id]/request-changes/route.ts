import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { canApprove, getAccessibleProject } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { notifyProjectMembers } from "@/lib/notify";
import { absoluteUrl } from "@/lib/utils";

const schema = z.object({
  note: z.string().trim().min(8).max(2000),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canApprove(user.role)) return jsonError("Only the client can request changes", 403);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Describe what needs to change (at least 8 characters)");

  const { id } = await params;
  const milestone = await prisma.milestone.findUnique({ where: { id } });
  if (!milestone) return jsonError("Milestone not found", 404);
  if (milestone.status !== "IN_REVIEW") {
    return jsonError("You can only send changes while a milestone is in review", 409);
  }

  const project = await getAccessibleProject(user, milestone.projectId);
  if (!project) return jsonError("Access denied", 403);

  await prisma.milestone.update({
    where: { id },
    data: { status: "CHANGES_REQUESTED", changeNote: parsed.data.note },
  });

  await logActivity({
    projectId: milestone.projectId,
    actorId: user.id,
    type: "CHANGES_REQUESTED",
    payload: { milestoneId: id, name: milestone.name, note: parsed.data.note },
  });

  await notifyProjectMembers({
    projectId: milestone.projectId,
    actorId: user.id,
    roles: ["ADMIN", "PROJECT_MANAGER"],
    subject: `${project.name}: changes requested on ${milestone.name}`,
    text: `${user.name} asked for changes on ${milestone.name} in ${project.name}.\n\n${parsed.data.note}\n\n${absoluteUrl(`/projects/${project.id}`)}`,
  });

  return NextResponse.json({ ok: true });
}

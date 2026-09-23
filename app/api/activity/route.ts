import { NextResponse } from "next/server";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { listAccessibleProjects } from "@/lib/rbac";

export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const projects = await listAccessibleProjects(user);
  const projectIds = projects.map((project) => project.id);
  const items = await prisma.activity.findMany({
    where: { projectId: { in: projectIds } },
    include: { actor: { select: { name: true } }, project: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  const unread = items.filter((item) => !profile?.lastSeenAt || item.createdAt > profile.lastSeenAt).length;

  return NextResponse.json({
    unread,
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      createdAt: item.createdAt,
      projectId: item.projectId,
      projectName: item.project.name,
      actorName: item.actor.name,
    })),
  });
}

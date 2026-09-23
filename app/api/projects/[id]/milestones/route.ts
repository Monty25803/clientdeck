import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getAccessibleProject, isAgency } from "@/lib/rbac";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  dueAt: z.string().trim().optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isAgency(user.role)) return jsonError("Clients cannot add milestones", 403);

  const { id } = await params;
  const project = await getAccessibleProject(user, id);
  if (!project) return jsonError("Project not found", 404);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Milestone name is required");

  const dueAt = parsed.data.dueAt ? new Date(parsed.data.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) return jsonError("Due date is not valid");

  const milestone = await prisma.milestone.create({
    data: {
      projectId: id,
      name: parsed.data.name,
      dueAt,
    },
  });

  return NextResponse.json({ id: milestone.id });
}

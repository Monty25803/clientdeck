import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { canManageOrg, getAccessibleProject, isAgency } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";

const patchSchema = z.object({
  archived: z.boolean().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  clientName: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const project = await getAccessibleProject(user, id);
  if (!project) return jsonError("Project not found", 404);
  return NextResponse.json({ project });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isAgency(user.role)) return jsonError("Clients cannot update projects", 403);

  const { id } = await params;
  const project = await getAccessibleProject(user, id);
  if (!project) return jsonError("Project not found", 404);

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid project update");

  const archivedAt =
    parsed.data.archived === undefined ? undefined : parsed.data.archived ? new Date() : null;

  const updated = await prisma.project.update({
    where: { id },
    data: {
      name: parsed.data.name,
      clientName: parsed.data.clientName,
      description: parsed.data.description,
      archivedAt,
    },
  });

  if (parsed.data.archived === true) {
    await logActivity({
      projectId: id,
      actorId: user.id,
      type: "PROJECT_ARCHIVED",
      payload: { name: updated.name },
    });
  }

  return NextResponse.json({ project: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageOrg(user.role)) return jsonError("Only admins can delete a project", 403);

  const { id } = await params;
  const project = await getAccessibleProject(user, id);
  if (!project) return jsonError("Project not found", 404);

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

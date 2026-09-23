import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAgency, listAccessibleProjects } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  clientName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
});

export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const projects = await listAccessibleProjects(user);
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isAgency(user.role)) return jsonError("Clients cannot create projects", 403);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Project and client names are required");

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      clientName: parsed.data.clientName,
      description: parsed.data.description || null,
      organizationId: user.organizationId,
      members: { create: { userId: user.id } },
      milestones: { create: { name: "Round 1" } },
    },
  });

  await logActivity({
    projectId: project.id,
    actorId: user.id,
    type: "PROJECT_CREATED",
    payload: { name: project.name },
  });

  return NextResponse.json({ id: project.id });
}

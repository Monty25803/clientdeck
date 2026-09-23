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
  if (!isAgency(user.role)) return jsonError("Only the studio can start the next round", 403);

  const { id } = await params;
  const source = await prisma.milestone.findUnique({
    where: { id },
    include: { assets: { include: { versions: { orderBy: { versionNumber: "asc" } } } } },
  });
  if (!source) return jsonError("Milestone not found", 404);
  if (source.status !== "APPROVED") {
    return jsonError("Approve this milestone before starting the next round", 409);
  }

  const project = await getAccessibleProject(user, source.projectId);
  if (!project) return jsonError("Access denied", 403);

  const existing = await prisma.milestone.count({ where: { projectId: source.projectId } });
  const created = await prisma.milestone.create({
    data: {
      projectId: source.projectId,
      name: `Round ${existing + 1}`,
      assets: {
        create: source.assets
          .map((asset) => {
            const latest = asset.versions.at(-1);
            if (!latest) return null;
            return {
              name: asset.name,
              versions: {
                create: {
                  versionNumber: 1,
                  storageKey: latest.storageKey,
                  mimeType: latest.mimeType,
                  sizeBytes: latest.sizeBytes,
                  width: latest.width,
                  height: latest.height,
                  uploadedById: user.id,
                },
              },
            };
          })
          .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      },
    },
  });

  await logActivity({
    projectId: source.projectId,
    actorId: user.id,
    type: "NEXT_ROUND_CREATED",
    payload: { fromMilestoneId: source.id, milestoneId: created.id, name: created.name },
  });

  await notifyProjectMembers({
    projectId: source.projectId,
    actorId: user.id,
    subject: `${project.name}: ${created.name} is open`,
    text: `${user.name} started ${created.name} from the approved files in ${source.name}.\n\n${absoluteUrl(`/projects/${project.id}`)}`,
  });

  return NextResponse.json({ id: created.id });
}

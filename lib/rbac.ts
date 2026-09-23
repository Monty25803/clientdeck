import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
};

export function isAgency(role: Role) {
  return role === "ADMIN" || role === "PROJECT_MANAGER";
}

export function canManageOrg(role: Role) {
  return role === "ADMIN";
}

export function canUpload(role: Role) {
  return isAgency(role);
}

export function canInvite(role: Role) {
  return isAgency(role);
}

export function canApprove(role: Role) {
  return role === "CLIENT";
}

export async function listAccessibleProjects(user: SessionUser, opts?: { includeArchived?: boolean }) {
  const archivedFilter = opts?.includeArchived ? {} : { archivedAt: null };

  if (user.role === "ADMIN") {
    return prisma.project.findMany({
      where: { organizationId: user.organizationId, ...archivedFilter },
      orderBy: { updatedAt: "desc" },
    });
  }

  return prisma.project.findMany({
    where: {
      organizationId: user.organizationId,
      members: { some: { userId: user.id } },
      ...archivedFilter,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAccessibleProject(user: SessionUser, projectId: string) {
  if (user.role === "ADMIN") {
    return prisma.project.findFirst({
      where: { id: projectId, organizationId: user.organizationId },
    });
  }

  return prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: user.organizationId,
      members: { some: { userId: user.id } },
    },
  });
}

export async function assertProjectAccess(user: SessionUser, projectId: string) {
  const project = await getAccessibleProject(user, projectId);
  if (!project) {
    throw new Error("Project not found or access denied");
  }
  return project;
}

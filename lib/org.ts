import { prisma } from "@/lib/prisma";
import { presignGet } from "@/lib/storage";

export async function getOrganization(organizationId: string) {
  return prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
}

export async function getLogoUrl(logoKey: string | null | undefined) {
  if (!logoKey) return null;
  const { url } = await presignGet(logoKey);
  return url;
}

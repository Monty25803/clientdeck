import { AppShell } from "@/components/app-shell";
import { BrandStyles } from "@/components/brand-styles";
import { getLogoUrl, getOrganization } from "@/lib/org";
import type { SessionUser } from "@/lib/rbac";

export async function AuthenticatedShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const org = await getOrganization(user.organizationId);
  const logoUrl = await getLogoUrl(org.logoKey);

  return (
    <>
      <BrandStyles brand={org} />
      <AppShell user={user} org={{ name: org.name, logoUrl }}>
        {children}
      </AppShell>
    </>
  );
}

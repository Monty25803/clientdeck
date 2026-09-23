import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getOrganization } from "@/lib/org";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { InviteForm } from "@/components/invite-form";
import { SettingsForm } from "@/components/settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const user = await requireRole(["ADMIN"]);
  const org = await getOrganization(user.organizationId);
  const members = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AuthenticatedShell user={user}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Studio</p>
      <h1 className="mt-1 font-serif text-4xl">Branding and people</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>White-label</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsForm name={org.name} primaryColor={org.primaryColor} accentColor={org.accentColor} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 text-sm">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-xl bg-paper-2 px-3 py-2">
                  <span>{member.name}</span>
                  <span className="text-xs uppercase tracking-[0.14em] text-muted">
                    {member.role.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
            <InviteForm defaultRole="PROJECT_MANAGER" />
          </CardContent>
        </Card>
      </div>
    </AuthenticatedShell>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAgency, listAccessibleProjects } from "@/lib/rbac";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { ActivityFeed } from "@/components/activity-feed";
import { FirstRunChecklist } from "@/components/first-run-checklist";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await requireUser();
  const agency = isAgency(user.role);
  const projects = await listAccessibleProjects(user);
  const archived = agency
    ? (await listAccessibleProjects(user, { includeArchived: true })).filter((project) => project.archivedAt)
    : [];
  const projectIds = projects.map((project) => project.id);

  const [pendingMilestones, changeMilestones, activities] = await Promise.all([
    prisma.milestone.findMany({
      where: { status: "IN_REVIEW", projectId: { in: projectIds } },
      include: { project: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.milestone.findMany({
      where: { status: "CHANGES_REQUESTED", projectId: { in: projectIds } },
      include: { project: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.activity.findMany({
      where: { projectId: { in: projectIds } },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <AuthenticatedShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Overview</p>
          <h1 className="mt-1 font-serif text-4xl">{agency ? "Delivery desk" : "Your reviews"}</h1>
        </div>
        {agency && (
          <Link href="/projects/new" className={buttonVariants()}>
            New project
          </Link>
        )}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Projects</p>
            <p className="mt-2 font-serif text-4xl">{projects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Awaiting sign-off</p>
            <p className="mt-2 font-serif text-4xl">{pendingMilestones.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Role</p>
            <p className="mt-2 font-serif text-3xl">{user.role.replace("_", " ")}</p>
          </CardContent>
        </Card>
      </div>

      {agency && changeMilestones.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Client asked for changes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {changeMilestones.map((milestone) => (
              <div key={milestone.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{milestone.name}</p>
                  <p className="text-sm text-muted">{milestone.project.name}</p>
                </div>
                <Link href={`/projects/${milestone.projectId}`} className={buttonVariants({ variant: "accent" })}>
                  Open and revise
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {user.role === "CLIENT" && pendingMilestones.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Ready for you</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingMilestones.map((milestone) => (
              <div key={milestone.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{milestone.name}</p>
                  <p className="text-sm text-muted">{milestone.project.name}</p>
                </div>
                <Link href={`/review/${milestone.id}`} className={buttonVariants({ variant: "accent" })}>
                  Review and sign off
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {projects.length === 0 ? (
            <FirstRunChecklist hasProject={false} isAgency={agency} />
          ) : (
            projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="block">
                <Card className="transition hover:-translate-y-0.5">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{project.name}</CardTitle>
                      <p className="mt-1 text-sm text-muted">{project.clientName}</p>
                    </div>
                    <Badge>Open</Badge>
                  </CardHeader>
                </Card>
              </Link>
            ))
          )}
          {archived.length > 0 && (
            <div className="pt-4">
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-muted">Archived</p>
              {archived.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="mb-3 block">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>{project.name}</CardTitle>
                        <p className="mt-1 text-sm text-muted">{project.clientName}</p>
                      </div>
                      <Badge tone="draft">Archived</Badge>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed items={activities} />
          </CardContent>
        </Card>
      </div>
    </AuthenticatedShell>
  );
}

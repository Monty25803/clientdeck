import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getAccessibleProject, isAgency } from "@/lib/rbac";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { ActivityFeed } from "@/components/activity-feed";
import { CopyButton } from "@/components/copy-button";
import { InviteForm } from "@/components/invite-form";
import { InviteList } from "@/components/invite-list";
import { MilestoneForm } from "@/components/milestone-form";
import { MilestoneActions } from "@/components/milestone-actions";
import { ProjectArchiveButton } from "@/components/project-archive-button";
import { RequestReviewButton } from "@/components/request-review-button";
import { UploadForm } from "@/components/upload-form";
import { canRequestSignOff, isMilestoneLocked, statusLabel, statusTone } from "@/lib/milestone";
import { absoluteUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const allowed = await getAccessibleProject(user, id);
  if (!allowed) notFound();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: { include: { user: true } },
      milestones: {
        orderBy: { createdAt: "asc" },
        include: {
          assets: {
            include: { versions: { orderBy: { versionNumber: "asc" } } },
          },
          approvals: { include: { user: true }, orderBy: { createdAt: "desc" } },
        },
      },
      activities: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
    },
  });
  if (!project) notFound();

  const agency = isAgency(user.role);
  const invites = await prisma.invite.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return (
    <AuthenticatedShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">{project.clientName}</p>
          <h1 className="mt-1 font-serif text-4xl">{project.name}</h1>
          {project.description && <p className="mt-3 max-w-2xl text-sm text-muted">{project.description}</p>}
          {project.archivedAt && <p className="mt-2 text-sm text-muted">This project is archived.</p>}
        </div>
        {agency && <ProjectArchiveButton projectId={project.id} archived={Boolean(project.archivedAt)} />}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {agency && (
            <Card>
              <CardHeader>
                <CardTitle>Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <MilestoneForm projectId={project.id} />
              </CardContent>
            </Card>
          )}

          {project.milestones.map((milestone) => (
            <Card key={milestone.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>{milestone.name}</CardTitle>
                  <p className="mt-1 text-xs text-muted">
                    {milestone.assets.length} assets
                    {milestone.dueAt ? ` · due ${milestone.dueAt.toLocaleString()}` : ""}
                  </p>
                </div>
                <Badge tone={statusTone(milestone.status)}>{statusLabel(milestone.status)}</Badge>
              </CardHeader>
              <CardContent className="space-y-5">
                {milestone.assets.length === 0 ? (
                  <div className="rounded-xl bg-paper-2 p-4 text-sm">
                    <p className="font-medium">Nothing to review yet</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                      <li>Upload an image or PDF</li>
                      <li>Invite the client</li>
                      <li>Request sign-off</li>
                    </ol>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {milestone.assets.map((asset) => {
                      const latest = asset.versions.at(-1);
                      return (
                        <Link
                          key={asset.id}
                          href={`/projects/${project.id}/assets/${asset.id}`}
                          className="rounded-2xl border border-rule bg-paper-2 p-4 hover:bg-white"
                        >
                          <p className="font-semibold">{asset.name}</p>
                          <p className="mt-1 text-xs text-muted">
                            {asset.versions.length} version{asset.versions.length === 1 ? "" : "s"}
                            {latest ? ` · v${latest.versionNumber}` : ""}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {milestone.changeNote && milestone.status === "CHANGES_REQUESTED" && (
                  <div className="rounded-xl border border-rule bg-paper-2 p-4 text-sm">
                    <p className="font-semibold">Client asked for changes</p>
                    <p className="mt-1 whitespace-pre-wrap">{milestone.changeNote}</p>
                  </div>
                )}

                {agency && (
                  <UploadForm milestoneId={milestone.id} locked={isMilestoneLocked(milestone.status)} />
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {agency && canRequestSignOff(milestone.status) && (
                    <RequestReviewButton
                      milestoneId={milestone.id}
                      disabled={milestone.assets.every((asset) => asset.versions.length === 0)}
                      label={milestone.status === "CHANGES_REQUESTED" ? "Send back for sign-off" : "Request sign-off"}
                    />
                  )}
                  {agency && milestone.status === "IN_REVIEW" && (
                    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-paper-2 px-3 py-2 text-sm">
                      <span>Waiting on the client.</span>
                      <CopyButton value={absoluteUrl(`/review/${milestone.id}`)} label="Copy review link" />
                    </div>
                  )}
                  {user.role === "CLIENT" && milestone.status === "IN_REVIEW" && (
                    <Link href={`/review/${milestone.id}`} className={buttonVariants({ variant: "accent" })}>
                      Review and sign off
                    </Link>
                  )}
                  {user.role === "CLIENT" && milestone.status === "CHANGES_REQUESTED" && (
                    <p className="text-sm text-muted">Waiting on the studio to send a new version.</p>
                  )}
                  {agency && milestone.status === "APPROVED" && (
                    <MilestoneActions milestoneId={milestone.id} canReopen canStartNext />
                  )}
                </div>

                {milestone.approvals[0] && (
                  <div className="rounded-xl border border-rule bg-paper-2 p-4 text-sm">
                    <p className="font-semibold">Formal sign-off</p>
                    <p className="mt-1">
                      {milestone.approvals[0].signerName} · {milestone.approvals[0].createdAt.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Hash {milestone.approvals[0].agreementHash.slice(0, 12)} · IP{" "}
                      {milestone.approvals[0].ipAddress ?? "n/a"}
                    </p>
                    <Link
                      href={`/projects/${project.id}/milestones/${milestone.id}/audit`}
                      className="mt-2 inline-block text-xs underline"
                    >
                      Open audit record
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>People</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {project.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <span>{member.user.name}</span>
                  <span className="text-xs uppercase tracking-[0.14em] text-muted">
                    {member.user.role.replace("_", " ")}
                  </span>
                </div>
              ))}
              {agency && (
                <div className="space-y-4 pt-4">
                  <InviteForm projectId={project.id} />
                  <InviteList
                    invites={invites.map((invite) => ({
                      ...invite,
                      url: absoluteUrl(`/invite/${invite.token}`),
                    }))}
                  />
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed items={project.activities} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedShell>
  );
}

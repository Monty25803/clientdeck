import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getAccessibleProject } from "@/lib/rbac";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { ReviewForm } from "@/components/review-form";
import { RequestChangesForm } from "@/components/request-changes-form";
import { statusLabel, statusTone } from "@/lib/milestone";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReviewPage({ params }: { params: Promise<{ milestoneId: string }> }) {
  const user = await requireUser();
  const { milestoneId } = await params;

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      project: true,
      approvals: { orderBy: { createdAt: "desc" }, include: { user: true } },
      assets: {
        include: { versions: { orderBy: { versionNumber: "asc" } } },
      },
    },
  });
  if (!milestone) notFound();

  const project = await getAccessibleProject(user, milestone.projectId);
  if (!project) notFound();
  if (user.role !== "CLIENT") redirect(`/projects/${milestone.projectId}`);

  const latestVersions = milestone.assets
    .map((asset) => ({ asset, version: asset.versions.at(-1) }))
    .filter((row) => row.version);

  return (
    <AuthenticatedShell user={user}>
      <Link href={`/projects/${milestone.projectId}`} className="text-sm text-muted hover:text-ink">
        ← {milestone.project.name}
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-4xl">Sign off · {milestone.name}</h1>
        <Badge tone={statusTone(milestone.status)}>{statusLabel(milestone.status)}</Badge>
      </div>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        Review the latest version of every asset. Approval records your name, time, IP address, and these exact versions.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Versions being signed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestVersions.map(({ asset, version }) => (
              <Link
                key={asset.id}
                href={`/projects/${milestone.projectId}/assets/${asset.id}`}
                className="block rounded-xl border border-rule bg-paper-2 p-4"
              >
                <p className="font-semibold">{asset.name}</p>
                <p className="text-xs text-muted">Version {version?.versionNumber}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Formal approval</CardTitle>
          </CardHeader>
          <CardContent>
            {milestone.status === "APPROVED" ? (
              <div className="space-y-3 text-sm">
                <p>
                  Approved by {milestone.approvals[0]?.signerName} on{" "}
                  {milestone.approvals[0]?.createdAt.toLocaleString()}. This milestone is locked.
                </p>
                <Link href={`/projects/${milestone.projectId}/milestones/${milestone.id}/audit`} className="underline">
                  Open audit record
                </Link>
              </div>
            ) : milestone.status === "CHANGES_REQUESTED" ? (
              <div className="space-y-2 text-sm">
                <p>You sent this back for changes. The studio will upload a new version and request sign-off again.</p>
                {milestone.changeNote && <p className="rounded-xl bg-paper-2 p-3">{milestone.changeNote}</p>}
              </div>
            ) : milestone.status !== "IN_REVIEW" ? (
              <p className="text-sm text-muted">The studio has not requested sign-off yet.</p>
            ) : (
              <div className="space-y-6">
                <ReviewForm milestoneId={milestone.id} />
                <RequestChangesForm milestoneId={milestone.id} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedShell>
  );
}

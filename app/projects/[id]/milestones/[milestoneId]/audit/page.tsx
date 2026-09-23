import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getAccessibleProject } from "@/lib/rbac";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { presignGet } from "@/lib/storage";
import { PrintButton } from "@/components/print-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string; milestoneId: string }>;
}) {
  const user = await requireUser();
  const { id, milestoneId } = await params;
  const allowed = await getAccessibleProject(user, id);
  if (!allowed) notFound();

  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, projectId: id },
    include: {
      project: true,
      approvals: { include: { user: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!milestone || milestone.approvals.length === 0) notFound();

  const approval = milestone.approvals[0];
  const signatureUrl = approval.signatureKey ? (await presignGet(approval.signatureKey)).url : null;
  const versions = Array.isArray(approval.versionSnapshot) ? approval.versionSnapshot : [];

  return (
    <AuthenticatedShell user={user}>
      <div className="print:hidden">
        <Link href={`/projects/${id}`} className="text-sm text-muted hover:text-ink">
          ← {milestone.project.name}
        </Link>
      </div>
      <h1 className="mt-2 font-serif text-4xl">Audit record · {milestone.name}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Formal project sign-off trail. Print or save this page. It is not a certified e-sign unless counsel says so.
      </p>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Who and when</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted">Signer name</span> · {approval.signerName}
          </p>
          <p>
            <span className="text-muted">Account</span> · {approval.user.email}
          </p>
          <p>
            <span className="text-muted">Approved</span> · {approval.createdAt.toLocaleString()}
          </p>
          <p>
            <span className="text-muted">IP</span> · {approval.ipAddress ?? "n/a"}
          </p>
          <p>
            <span className="text-muted">User agent</span> · {approval.userAgent ?? "n/a"}
          </p>
          <p>
            <span className="text-muted">Agreement hash</span> · {approval.agreementHash}
          </p>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Versions signed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {versions.map((row) => {
            const item = row as {
              assetName?: string;
              versionNumber?: number;
              versionId?: string;
            };
            return (
              <p key={`${item.versionId}-${item.assetName}`}>
                {item.assetName} · v{item.versionNumber} · {item.versionId}
              </p>
            );
          })}
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Agreement text</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm leading-relaxed">{approval.agreementText}</CardContent>
      </Card>
      {signatureUrl && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Drawn signature</CardTitle>
          </CardHeader>
          <CardContent>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signatureUrl} alt="Drawn signature" className="max-w-md rounded-xl border border-rule bg-white" />
          </CardContent>
        </Card>
      )}
      <PrintButton />
    </AuthenticatedShell>
  );
}

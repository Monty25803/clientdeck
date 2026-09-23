import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getAccessibleProject, isAgency } from "@/lib/rbac";
import { isMilestoneLocked, statusLabel, statusTone } from "@/lib/milestone";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { AssetStage } from "@/components/asset-stage";
import { UploadForm } from "@/components/upload-form";
import { Badge } from "@/components/ui/badge";

function toView(version: {
  id: string;
  versionNumber: number;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  annotations: {
    id: string;
    authorId: string;
    x: number;
    y: number;
    resolvedAt: Date | null;
    comments: {
      id: string;
      body: string;
      createdAt: Date;
      editedAt: Date | null;
      authorId: string;
      author: { name: string };
    }[];
  }[];
}) {
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    width: version.width,
    height: version.height,
    sizeBytes: version.sizeBytes,
    pins: version.annotations.map((pin) => ({
      id: pin.id,
      x: pin.x,
      y: pin.y,
      authorId: pin.authorId,
      resolvedAt: pin.resolvedAt?.toISOString() ?? null,
      comments: pin.comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        editedAt: comment.editedAt?.toISOString() ?? null,
        authorId: comment.authorId,
        author: comment.author,
      })),
    })),
  };
}

export default async function AssetPage({
  params,
}: {
  params: Promise<{ id: string; assetId: string }>;
}) {
  const user = await requireUser();
  const { id, assetId } = await params;
  const allowed = await getAccessibleProject(user, id);
  if (!allowed) notFound();

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, milestone: { projectId: id } },
    include: {
      milestone: true,
      versions: {
        orderBy: { versionNumber: "asc" },
        include: {
          annotations: {
            include: {
              comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  if (!asset) notFound();

  const latest = asset.versions.at(-1);
  const previous = asset.versions.length > 1 ? asset.versions.at(-2) : null;
  const agency = isAgency(user.role);
  const locked = isMilestoneLocked(asset.milestone.status);

  return (
    <AuthenticatedShell user={user}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/projects/${id}`} className="text-sm text-muted hover:text-ink">
            ← {asset.milestone.name}
          </Link>
          <h1 className="mt-2 font-serif text-4xl">{asset.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {asset.versions.length} stacked version{asset.versions.length === 1 ? "" : "s"}
          </p>
        </div>
        <Badge tone={statusTone(asset.milestone.status)}>{statusLabel(asset.milestone.status)}</Badge>
      </div>

      {agency && (
        <div className="mb-6 rounded-2xl border border-rule bg-white/70 p-4">
          <UploadForm milestoneId={asset.milestoneId} assetId={asset.id} locked={locked} />
        </div>
      )}

      {!latest ? (
        <p className="text-sm text-muted">Upload the first version to open the canvas.</p>
      ) : (
        <AssetStage
          locked={locked}
          currentUserId={user.id}
          canModerate={agency}
          latest={toView(latest)}
          previous={previous ? toView(previous) : null}
        />
      )}
    </AuthenticatedShell>
  );
}

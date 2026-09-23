import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { listAccessibleProjects } from "@/lib/rbac";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const projects = await listAccessibleProjects(user, { includeArchived: true });
  const projectIds = projects.map((project) => project.id);

  const [projectHits, assetHits, commentHits] = query.length < 2
    ? [[], [], []]
    : await Promise.all([
        prisma.project.findMany({
          where: {
            id: { in: projectIds },
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { clientName: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 12,
        }),
        prisma.asset.findMany({
          where: {
            name: { contains: query, mode: "insensitive" },
            milestone: { projectId: { in: projectIds } },
          },
          include: { milestone: { include: { project: true } } },
          take: 12,
        }),
        prisma.comment.findMany({
          where: {
            body: { contains: query, mode: "insensitive" },
            annotation: { version: { asset: { milestone: { projectId: { in: projectIds } } } } },
          },
          include: {
            author: { select: { name: true } },
            annotation: { include: { version: { include: { asset: { include: { milestone: true } } } } } },
          },
          take: 12,
        }),
      ]);

  return (
    <AuthenticatedShell user={user}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Search</p>
      <h1 className="mt-1 font-serif text-4xl">{query ? `Results for “${query}”` : "Search"}</h1>
      <p className="mt-3 text-sm text-muted">
        Find projects, assets, and comment text. Type at least two characters in the header search.
      </p>

      {query.length >= 2 && (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {projectHits.length === 0 && <p className="text-muted">No matching projects.</p>}
              {projectHits.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="block underline">
                  {project.name}
                  <span className="ml-2 text-muted no-underline">{project.clientName}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {assetHits.length === 0 && <p className="text-muted">No matching assets.</p>}
              {assetHits.map((asset) => (
                <Link
                  key={asset.id}
                  href={`/projects/${asset.milestone.projectId}/assets/${asset.id}`}
                  className="block underline"
                >
                  {asset.name}
                  <span className="ml-2 text-muted no-underline">{asset.milestone.project.name}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {commentHits.length === 0 && <p className="text-muted">No matching comments.</p>}
              {commentHits.map((comment) => (
                <Link
                  key={comment.id}
                  href={`/projects/${comment.annotation.version.asset.milestone.projectId}/assets/${comment.annotation.version.assetId}`}
                  className="block"
                >
                  <p className="font-semibold">{comment.author.name}</p>
                  <p className="text-muted">{comment.body}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </AuthenticatedShell>
  );
}

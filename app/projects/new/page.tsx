import { requireRole } from "@/lib/session";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { ProjectForm } from "@/components/project-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewProjectPage() {
  const user = await requireRole(["ADMIN", "PROJECT_MANAGER"]);

  return (
    <AuthenticatedShell user={user}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">New delivery</p>
      <h1 className="mt-1 font-serif text-4xl">Open a project</h1>
      <Card className="mt-8 max-w-xl">
        <CardHeader>
          <CardTitle>Project details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm />
        </CardContent>
      </Card>
    </AuthenticatedShell>
  );
}

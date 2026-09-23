import Link from "next/link";

export function FirstRunChecklist({
  hasProject,
  isAgency,
}: {
  hasProject: boolean;
  isAgency: boolean;
}) {
  if (hasProject) return null;

  return (
    <div className="rounded-2xl border border-dashed border-rule bg-white/70 p-6">
      <p className="font-serif text-2xl">{isAgency ? "Open the first job" : "Waiting for a project"}</p>
      {isAgency ? (
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
          <li>
            <Link href="/projects/new" className="underline">
              Create a project
            </Link>
          </li>
          <li>Invite the client with a copyable link</li>
          <li>Upload an image or PDF</li>
          <li>Request sign-off — or the client can send changes back</li>
        </ol>
      ) : (
        <p className="mt-3 text-sm text-muted">
          The studio still needs to invite you to a project. Ask them to send the ClientDeck link.
        </p>
      )}
    </div>
  );
}

import { requireUser } from "@/lib/session";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const studioSteps = [
  ["Create the studio", "The first visitor at this URL becomes the Agency Admin and names the studio."],
  ["Open a project", "Projects → New project. Name the job and the client. Round 1 is created for you."],
  ["Invite people", "On the project, invite a client (required) or a project manager. Copy the link if SMTP is off."],
  ["Upload work", "Add an image or a PDF (first 20 pages). New files on the same asset stack as versions."],
  ["Collect feedback", "Click the image to drop a pin, write the note, then save. Resolve a thread when it is done."],
  ["Ask for sign-off", "Request sign-off. The client sees Ready for you and gets email if SMTP is configured."],
  ["Revise or lock", "If they request changes, upload a new version and send it back. If they approve, print the audit page."],
  ["Next round", "After approval, start the next round from the signed files, or reopen the same milestone if you must edit."],
];

const clientSteps = [
  ["Join the invite", "Open the link, set your name and password. You only see projects you were invited to."],
  ["Review the latest files", "Open Ready for you, then each asset. Use Then / Now / Compare when there is more than one version."],
  ["Leave pins", "Click the image, write what should change, save. Comments stay on that version."],
  ["Send it back or sign", "Request changes with a note, or type your name and approve. Approval writes an audit record."],
];

export default async function HelpPage() {
  const user = await requireUser();

  return (
    <AuthenticatedShell user={user}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Guide</p>
      <h1 className="mt-1 font-serif text-4xl">How to use ClientDeck</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        ClientDeck is the studio’s portal for delivering files, collecting pins, and recording formal milestone
        sign-off. This page is the same guide as the README, kept in the product so the team can use it without
        leaving the portal.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Studio</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              {studioSteps.map(([title, body], index) => (
                <li key={title} className="flex gap-3">
                  <span className="font-serif text-xl leading-none">{index + 1}</span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Client</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              {clientSteps.map(([title, body], index) => (
                <li key={title} className="flex gap-3">
                  <span className="font-serif text-xl leading-none">{index + 1}</span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Roles and records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>Admin</strong> — branding, every project, invites, archive.{" "}
            <strong>Project manager</strong> — assigned projects, upload, request sign-off.{" "}
            <strong>Client</strong> — comment, request changes, approve.
          </p>
          <p>
            Approval stores the typed name, time, IP address, browser, agreement text, a hash of that text, and the
            exact asset versions. Open the audit page and use Print / save PDF. This is a formal project trail, not a
            certified e-sign under eIDAS or the ESIGN Act unless your counsel says otherwise.
          </p>
          <p className="text-muted">
            SMTP is optional. Without it, invite and password-reset links are shown in the UI to copy. With it, clients
            also get mail when sign-off is requested, someone comments, they send changes, or a milestone is approved.
          </p>
          <p>
            Operator setup (Docker, environment variables, backups, production checklist) lives in the{" "}
            <code>README.md</code> of this instance’s source tree.
          </p>
        </CardContent>
      </Card>
    </AuthenticatedShell>
  );
}

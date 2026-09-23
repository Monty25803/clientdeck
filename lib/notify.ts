import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { mailConfigured } from "@/lib/env";

export async function notifyProjectMembers(input: {
  projectId: string;
  actorId: string;
  subject: string;
  text: string;
  roles?: Role[];
}) {
  if (!mailConfigured()) return { sent: 0 };

  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    include: {
      members: { include: { user: true } },
      organization: { include: { users: { where: { role: "ADMIN" } } } },
    },
  });
  if (!project) return { sent: 0 };

  const people = new Map<string, { id: string; email: string; name: string; role: Role }>();
  for (const member of project.members) {
    people.set(member.user.id, member.user);
  }
  for (const admin of project.organization.users) {
    people.set(admin.id, admin);
  }

  const recipients = [...people.values()].filter((person) => {
    if (person.id === input.actorId) return false;
    if (input.roles && !input.roles.includes(person.role)) return false;
    return Boolean(person.email);
  });

  let sent = 0;
  for (const person of recipients) {
    const result = await sendMail({
      to: person.email,
      subject: input.subject,
      text: input.text,
    });
    if (result.sent) sent += 1;
  }
  return { sent };
}

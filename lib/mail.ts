import { env, mailConfigured } from "@/lib/env";

export async function sendMail(input: { to: string; subject: string; text: string }) {
  if (!mailConfigured()) return { sent: false as const };

  const { createTransport } = await import("nodemailer");
  const config = env();
  const transport = createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT ?? 587,
    secure: (config.SMTP_PORT ?? 587) === 465,
    auth: config.SMTP_USER
      ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
      : undefined,
  });

  await transport.sendMail({
    from: config.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });

  return { sent: true as const };
}

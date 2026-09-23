import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { addHours } from "date-fns";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";
import { mailConfigured } from "@/lib/env";
import { sendMail } from "@/lib/mail";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "forgot"), 5, 15 * 60 * 1000);
  if (!limited.ok) return jsonError("Too many reset requests. Try again shortly.", 429);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Enter a valid email");

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return NextResponse.json({ ok: true, mailed: false, mailConfigured: mailConfigured() });
  }

  const token = randomBytes(24).toString("hex");
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token,
      expiresAt: addHours(new Date(), 1),
    },
  });

  const url = absoluteUrl(`/reset/${token}`);
  const mailed = await sendMail({
    to: user.email,
    subject: "Reset your ClientDeck password",
    text: `Reset your password:\n\n${url}\n\nThis link expires in one hour.`,
  });

  return NextResponse.json({
    ok: true,
    mailed: mailed.sent,
    mailConfigured: mailConfigured(),
    url: mailed.sent ? undefined : url,
  });
}

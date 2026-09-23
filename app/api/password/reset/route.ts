import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(120),
});

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "reset"), 8, 15 * 60 * 1000);
  if (!limited.ok) return jsonError("Too many attempts. Try again shortly.", 429);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Password must be at least 8 characters");

  const reset = await prisma.passwordReset.findUnique({ where: { token: parsed.data.token } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return jsonError("This reset link is invalid or has expired", 410);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) },
    }),
    prisma.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

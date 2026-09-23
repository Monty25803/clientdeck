import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  organizationName: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(120),
});

export async function GET() {
  const count = await prisma.user.count();
  return NextResponse.json({ needsSetup: count === 0 });
}

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "setup"), 5, 15 * 60 * 1000);
  if (!limited.ok) return jsonError("Too many setup attempts. Try again shortly.", 429);

  const existing = await prisma.user.count();
  if (existing > 0) {
    return jsonError("This instance is already set up", 409);
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid setup data");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const organization = await prisma.organization.create({
    data: {
      name: parsed.data.organizationName,
      users: {
        create: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
          role: "ADMIN",
        },
      },
    },
  });

  return NextResponse.json({ ok: true, organizationId: organization.id });
}

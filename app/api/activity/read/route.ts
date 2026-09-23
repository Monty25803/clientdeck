import { NextResponse } from "next/server";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

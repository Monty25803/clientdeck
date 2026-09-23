import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: true, service: "clientdeck" });
  } catch {
    return NextResponse.json({ ok: false, db: false, service: "clientdeck" }, { status: 503 });
  }
}

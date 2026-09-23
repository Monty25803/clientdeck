import { NextResponse } from "next/server";
import { currentUser, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { canManageOrg } from "@/lib/rbac";
import { objectKey, putObject } from "@/lib/storage";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/upload-constants";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageOrg(user.role)) return jsonError("Only admins can change branding", 403);

  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const primaryColor = String(form.get("primaryColor") ?? "").trim();
  const accentColor = String(form.get("accentColor") ?? "").trim();
  if (name.length < 2) return jsonError("Studio name is required");
  if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor) || !/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    return jsonError("Colors must be hex values");
  }

  let logoKey: string | undefined;
  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(logo.type)) return jsonError("Logo must be an image");
    if (logo.size > MAX_UPLOAD_BYTES) return jsonError("Logo is too large");
    logoKey = objectKey("logos", logo.name);
    await putObject(logoKey, Buffer.from(await logo.arrayBuffer()), logo.type);
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      name,
      primaryColor,
      accentColor,
      ...(logoKey ? { logoKey } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { currentUser, jsonError } from "@/lib/api";
import { canUpload } from "@/lib/rbac";
import { putObject } from "@/lib/storage";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/upload-constants";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canUpload(user.role)) return jsonError("You cannot upload assets", 403);

  const form = await request.formData();
  const key = String(form.get("key") ?? "");
  const file = form.get("file");
  if (!key.startsWith("assets/") || !(file instanceof File)) {
    return jsonError("Invalid upload");
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return jsonError("Only image files are allowed");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError("Files must be 25 MB or smaller");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await putObject(key, buffer, file.type);
  return NextResponse.json({ ok: true, key });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, jsonError } from "@/lib/api";
import { canUpload } from "@/lib/rbac";
import { objectKey, presignPut } from "@/lib/storage";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/upload-constants";

const schema = z.object({
  filename: z.string().min(1).max(180),
  mimeType: z.string(),
  size: z.number().int().positive(),
});

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canUpload(user.role)) return jsonError("You cannot upload assets", 403);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid upload request");
  if (!ALLOWED_IMAGE_TYPES.includes(parsed.data.mimeType)) {
    return jsonError("Only PNG, JPEG, WebP, and GIF files are allowed");
  }
  if (parsed.data.size > MAX_UPLOAD_BYTES) {
    return jsonError("Files must be 25 MB or smaller");
  }

  const key = objectKey("assets", parsed.data.filename);
  const signed = await presignPut(key, parsed.data.mimeType);
  return NextResponse.json(signed);
}

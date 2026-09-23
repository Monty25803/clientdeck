"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALLOWED_IMAGE_TYPES, ALLOWED_PDF_TYPE, MAX_UPLOAD_BYTES } from "@/lib/upload-constants";

async function readDimensions(file: File): Promise<{ width?: number; height?: number }> {
  if (!file.type.startsWith("image/")) return {};
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    img.src = url;
  });
}

async function uploadFile(file: File, key: string, presignedUrl: string) {
  const put = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (put.ok) return;
  const form = new FormData();
  form.set("key", key);
  form.set("file", file);
  const fallback = await fetch("/api/uploads/direct", { method: "POST", body: form });
  if (!fallback.ok) {
    throw new Error("Upload failed");
  }
}

async function saveVersion(input: {
  milestoneId: string;
  assetId?: string;
  name: string;
  file: File;
  width?: number;
  height?: number;
}) {
  const presign = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: input.file.name, mimeType: input.file.type, size: input.file.size }),
  });
  const signed = await presign.json();
  if (!presign.ok) throw new Error(signed.error ?? "Could not prepare upload");
  await uploadFile(input.file, signed.key, signed.url);
  const complete = await fetch("/api/uploads/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      milestoneId: input.milestoneId,
      assetId: input.assetId,
      name: input.name,
      key: signed.key,
      mimeType: input.file.type,
      sizeBytes: input.file.size,
      width: input.width,
      height: input.height,
    }),
  });
  const data = await complete.json();
  if (!complete.ok) throw new Error(data.error ?? "Could not save asset");
  return data;
}

export function UploadForm({
  milestoneId,
  assetId,
  locked,
}: {
  milestoneId: string;
  assetId?: string;
  locked?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accept = assetId ? ALLOWED_IMAGE_TYPES.join(",") : [...ALLOWED_IMAGE_TYPES, ALLOWED_PDF_TYPE].join(",");

  if (locked) {
    return <p className="text-sm text-muted">This milestone is approved and locked.</p>;
  }

  async function onSubmit(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose an image or PDF.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Files must be 25 MB or smaller.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const baseName = String(formData.get("name") || file.name.replace(/\.[^.]+$/, ""));
      if (file.type === ALLOWED_PDF_TYPE) {
        if (assetId) throw new Error("Stack a new image version, or upload the PDF as new pages.");
        const { renderPdfPages } = await import("@/lib/pdf-pages");
        const { pages, truncated } = await renderPdfPages(file);
        if (pages.length === 0) throw new Error("Could not read that PDF.");
        for (const page of pages) {
          await saveVersion({
            milestoneId,
            name: `${baseName} — p.${page.page}`,
            file: page.file,
            width: page.width,
            height: page.height,
          });
        }
        if (truncated) setError("Only the first 20 pages were imported.");
      } else {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          throw new Error("PNG, JPEG, WebP, GIF, or PDF only.");
        }
        const dims = await readDimensions(file);
        await saveVersion({
          milestoneId,
          assetId,
          name: baseName,
          file,
          width: dims.width,
          height: dims.height,
        });
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      {!assetId && (
        <div className="space-y-2">
          <Label htmlFor="name">Asset name</Label>
          <Input id="name" name="name" placeholder="Homepage hero" />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="file">{assetId ? "New version" : "Image or PDF"}</Label>
        <Input id="file" name="file" type="file" accept={accept} required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : assetId ? "Stack version" : "Upload"}
      </Button>
      {error && <p className="sm:col-span-3 text-sm text-[var(--danger)]">{error}</p>}
    </form>
  );
}

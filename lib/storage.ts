import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const SIGNED_PUT_SECONDS = 15 * 60;
const SIGNED_GET_SECONDS = 15 * 60;

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

function client(endpoint: string) {
  return new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    credentials: {
      accessKeyId: required("S3_ACCESS_KEY"),
      secretAccessKey: required("S3_SECRET_KEY"),
    },
  });
}

export function internalS3() {
  return client(required("S3_ENDPOINT"));
}

export function publicS3() {
  return client(process.env.S3_PUBLIC_ENDPOINT || required("S3_ENDPOINT"));
}

export function bucket() {
  return required("S3_BUCKET");
}

export async function ensureBucket() {
  const s3 = internalS3();
  const name = bucket();
  try {
    await s3.send(new HeadBucketCommand({ Bucket: name }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: name }));
  }
}

export function objectKey(kind: "assets" | "logos" | "signatures", filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `${kind}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safe}`;
}

export async function presignPut(key: string, contentType: string) {
  await ensureBucket();
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(publicS3(), command, { expiresIn: SIGNED_PUT_SECONDS });
  return { url, key, expiresIn: SIGNED_PUT_SECONDS };
}

export async function presignGet(key: string) {
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
  });
  const url = await getSignedUrl(publicS3(), command, { expiresIn: SIGNED_GET_SECONDS });
  return { url, key, expiresIn: SIGNED_GET_SECONDS };
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await ensureBucket();
  await internalS3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

export { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/upload-constants";

import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { badRequest } from "@/lib/api";
import { env } from "@/lib/env";

/**
 * Image storage abstraction.
 *  - local:      files on disk under UPLOAD_DIR, served by /uploads/[...path] (mount a volume in production)
 *  - cloudinary: signed server-side upload; API secret never leaves the server
 * Validation: real file signature (magic bytes), allow-listed types only (no SVG), size limit.
 */

export type StoredImage = { url: string; storageKey: string };

const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { mime: "image/avif", ext: "avif", test: (b) => b.subarray(4, 8).toString("ascii") === "ftyp" && ["avif", "avis"].includes(b.subarray(8, 12).toString("ascii")) },
];

export function detectImageType(buf: Buffer) {
  return SIGNATURES.find((s) => s.test(buf)) ?? null;
}

export async function validateImageFile(file: File): Promise<{ buffer: Buffer; mime: string; ext: string }> {
  const maxBytes = env().UPLOAD_MAX_MB * 1024 * 1024;
  if (file.size === 0) throw badRequest("The file is empty.");
  if (file.size > maxBytes) throw badRequest(`Images must be ${env().UPLOAD_MAX_MB} MB or smaller.`);
  const buffer = Buffer.from(await file.arrayBuffer());
  const type = detectImageType(buffer);
  if (!type) throw badRequest("Only JPEG, PNG, WebP or AVIF images are allowed.");
  return { buffer, mime: type.mime, ext: type.ext };
}

export function uploadRoot() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), env().UPLOAD_DIR);
}

async function saveLocal(buffer: Buffer, ext: string, folder: string): Promise<StoredImage> {
  const now = new Date();
  const rel = path.posix.join(folder, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"), `${randomUUID()}.${ext}`);
  const abs = path.join(/*turbopackIgnore: true*/ uploadRoot(), ...rel.split("/"));
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buffer, { flag: "wx" });
  return { url: `/uploads/${rel}`, storageKey: `local:${rel}` };
}

async function saveCloudinary(buffer: Buffer, mime: string, folder: string): Promise<StoredImage> {
  const e = env();
  const timestamp = Math.floor(Date.now() / 1000);
  const fullFolder = `${e.CLOUDINARY_FOLDER}/${folder}`;
  const toSign = `folder=${fullFolder}&timestamp=${timestamp}${e.CLOUDINARY_API_SECRET}`;
  const signature = createHash("sha1").update(toSign).digest("hex");
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mime }));
  form.append("api_key", e.CLOUDINARY_API_KEY!);
  form.append("timestamp", String(timestamp));
  form.append("folder", fullFolder);
  form.append("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${e.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Cloudinary upload failed (${res.status})`);
  const data = (await res.json()) as { secure_url: string; public_id: string };
  return { url: data.secure_url, storageKey: `cloudinary:${data.public_id}` };
}

export async function storeImage(file: File, folder: "products" | "categories" | "banners" | "store" = "products"): Promise<StoredImage> {
  const { buffer, mime, ext } = await validateImageFile(file);
  return env().STORAGE_DRIVER === "cloudinary" ? saveCloudinary(buffer, mime, folder) : saveLocal(buffer, ext, folder);
}

/** Best-effort deletion of a stored image (missing files are ignored). */
export async function deleteStoredImage(storageKey: string | null | undefined) {
  if (!storageKey) return;
  try {
    if (storageKey.startsWith("local:")) {
      const rel = storageKey.slice("local:".length);
      const abs = path.resolve(/*turbopackIgnore: true*/ uploadRoot(), ...rel.split("/"));
      if (!abs.startsWith(uploadRoot())) return; // path traversal guard
      await unlink(abs);
    } else if (storageKey.startsWith("cloudinary:")) {
      const e = env();
      const publicId = storageKey.slice("cloudinary:".length);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createHash("sha1").update(`public_id=${publicId}&timestamp=${timestamp}${e.CLOUDINARY_API_SECRET}`).digest("hex");
      const form = new FormData();
      form.append("public_id", publicId);
      form.append("api_key", e.CLOUDINARY_API_KEY!);
      form.append("timestamp", String(timestamp));
      form.append("signature", signature);
      await fetch(`https://api.cloudinary.com/v1_1/${e.CLOUDINARY_CLOUD_NAME}/image/destroy`, { method: "POST", body: form });
    }
  } catch (err) {
    console.warn("[storage] delete failed", storageKey, err);
  }
}

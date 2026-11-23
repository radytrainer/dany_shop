import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { uploadRoot } from "@/lib/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };

/** Serves locally stored uploads (STORAGE_DRIVER=local). Nginx can serve the same directory directly in production. */
export async function GET(_req: Request, ctx: RouteContext<"/uploads/[...path]">) {
  const { path: parts } = await ctx.params;
  if (!parts.every((p) => /^[\w.-]+$/.test(p) && p !== ".." && p !== ".")) return new Response("Not found", { status: 404 });
  const root = uploadRoot();
  const abs = path.resolve(/*turbopackIgnore: true*/ root, ...parts);
  if (!abs.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });
  const ext = path.extname(abs).slice(1).toLowerCase();
  const type = TYPES[ext];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const info = await stat(abs);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    const body = await readFile(abs);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

import { badRequest, ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { enforceRateLimit } from "@/lib/security";
import { storeImage } from "@/lib/storage";
import { logAdminActivity } from "@/services/audit";

const FOLDERS = ["products", "categories", "banners", "store"] as const;

/** POST /api/admin/uploads — multipart image upload (field "file", optional "folder"). */
export const POST = adminRoute("products.view", async (req, _ctx, user) => {
  enforceRateLimit(req, "upload", user.id);
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 25 * 1024 * 1024) throw badRequest("Upload too large.");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw badRequest("Expected multipart form data.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("No file uploaded.");
  const folderRaw = String(form.get("folder") ?? "products");
  const folder = (FOLDERS as readonly string[]).includes(folderRaw) ? (folderRaw as (typeof FOLDERS)[number]) : "products";
  const stored = await storeImage(file, folder);
  await logAdminActivity({ userId: user.id, action: "upload.image", entityType: "Upload", entityId: stored.storageKey, ip: user.ip });
  return ok(stored, { status: 201 });
});

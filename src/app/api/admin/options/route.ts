import { z } from "zod";
import { badRequest, ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { colorInputSchema, sizeInputSchema } from "@/lib/validations/admin";
import { prisma } from "@/lib/prisma";
import { deleteOption, saveColor, saveSize } from "@/services/admin-content";

const bodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("size"), id: z.string().uuid().optional(), data: sizeInputSchema }),
  z.object({ kind: z.literal("color"), id: z.string().uuid().optional(), data: colorInputSchema }),
]);

/** GET /api/admin/options — sizes and colours. */
export const GET = adminRoute("products.view", async () => {
  const [sizes, colors] = await Promise.all([prisma.size.findMany({ orderBy: { sortOrder: "asc" } }), prisma.color.findMany({ orderBy: { sortOrder: "asc" } })]);
  return ok({ sizes, colors });
});

/** POST /api/admin/options — create or update a size / colour. */
export const POST = adminRoute("products.manage", async (req, _ctx, user) => {
  const body = await parseJson(req, bodySchema);
  return ok(body.kind === "size" ? await saveSize(body.data, user, body.id) : await saveColor(body.data, user, body.id));
});

/** DELETE /api/admin/options?kind=size&id=… — only when unused. */
export const DELETE = adminRoute("products.manage", async (req, _ctx, user) => {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const id = url.searchParams.get("id") ?? "";
  if ((kind !== "size" && kind !== "color") || !z.string().uuid().safeParse(id).success) throw badRequest("Invalid option");
  await deleteOption(kind, id, user);
  return ok({ deleted: id });
});

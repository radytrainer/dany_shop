import { ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { collectionInputSchema } from "@/lib/validations/admin";
import { deleteCollection, saveCollection } from "@/services/admin-content";

type Ctx = RouteContext<"/api/admin/collections/[id]">;

/** PUT /api/admin/collections/[id] */
export const PUT = adminRoute<Ctx>("content.manage", async (req, ctx, user) => {
  const { id } = await ctx.params;
  return ok(await saveCollection(await parseJson(req, collectionInputSchema), user, id));
});

/** DELETE /api/admin/collections/[id] */
export const DELETE = adminRoute<Ctx>("content.manage", async (_req, ctx, user) => {
  const { id } = await ctx.params;
  await deleteCollection(id, user);
  return ok({ deleted: id });
});

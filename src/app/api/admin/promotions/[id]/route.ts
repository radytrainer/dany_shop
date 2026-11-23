import { ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { promotionInputSchema } from "@/lib/validations/admin";
import { deletePromotion, savePromotion } from "@/services/admin-content";

type Ctx = RouteContext<"/api/admin/promotions/[id]">;

/** PUT /api/admin/promotions/[id] */
export const PUT = adminRoute<Ctx>("promotions.manage", async (req, ctx, user) => {
  const { id } = await ctx.params;
  return ok(await savePromotion(await parseJson(req, promotionInputSchema), user, id));
});

/** DELETE /api/admin/promotions/[id] */
export const DELETE = adminRoute<Ctx>("promotions.manage", async (_req, ctx, user) => {
  const { id } = await ctx.params;
  await deletePromotion(id, user);
  return ok({ deleted: id });
});

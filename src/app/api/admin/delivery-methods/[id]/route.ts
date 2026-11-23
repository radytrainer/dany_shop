import { ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { deliveryMethodInputSchema } from "@/lib/validations/admin";
import { deleteDeliveryMethod, saveDeliveryMethod } from "@/services/admin-content";

type Ctx = RouteContext<"/api/admin/delivery-methods/[id]">;

/** PUT /api/admin/delivery-methods/[id] */
export const PUT = adminRoute<Ctx>("settings.manage", async (req, ctx, user) => {
  const { id } = await ctx.params;
  return ok(await saveDeliveryMethod(await parseJson(req, deliveryMethodInputSchema), user, id));
});

/** DELETE /api/admin/delivery-methods/[id] — deactivates if used by orders. */
export const DELETE = adminRoute<Ctx>("settings.manage", async (_req, ctx, user) => {
  const { id } = await ctx.params;
  return ok({ result: await deleteDeliveryMethod(id, user) });
});

import { ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { couponInputSchema } from "@/lib/validations/admin";
import { deleteCoupon, saveCoupon } from "@/services/admin-content";

type Ctx = RouteContext<"/api/admin/coupons/[id]">;

/** PUT /api/admin/coupons/[id] */
export const PUT = adminRoute<Ctx>("promotions.manage", async (req, ctx, user) => {
  const { id } = await ctx.params;
  return ok(await saveCoupon(await parseJson(req, couponInputSchema), user, id));
});

/** DELETE /api/admin/coupons/[id] — deactivates instead when the coupon was used. */
export const DELETE = adminRoute<Ctx>("promotions.manage", async (_req, ctx, user) => {
  const { id } = await ctx.params;
  return ok({ result: await deleteCoupon(id, user) });
});

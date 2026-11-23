import { ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { bannerInputSchema } from "@/lib/validations/admin";
import { deleteBanner, saveBanner } from "@/services/admin-content";

type Ctx = RouteContext<"/api/admin/banners/[id]">;

/** PUT /api/admin/banners/[id] */
export const PUT = adminRoute<Ctx>("content.manage", async (req, ctx, user) => {
  const { id } = await ctx.params;
  return ok(await saveBanner(await parseJson(req, bannerInputSchema), user, id));
});

/** DELETE /api/admin/banners/[id] */
export const DELETE = adminRoute<Ctx>("content.manage", async (_req, ctx, user) => {
  const { id } = await ctx.params;
  await deleteBanner(id, user);
  return ok({ deleted: id });
});

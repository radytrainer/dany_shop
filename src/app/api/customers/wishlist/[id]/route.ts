import { z } from "zod";
import { badRequest, ok, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { removeFromWishlist } from "@/services/wishlist";

/** DELETE /api/customers/wishlist/[id] — remove a product (id = product id). */
export const DELETE = route<RouteContext<"/api/customers/wishlist/[id]">>(async (req, ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) throw badRequest("Invalid id");
  await removeFromWishlist(user.id, id);
  return ok({ removed: id });
});

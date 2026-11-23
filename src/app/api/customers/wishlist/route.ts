import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { addToWishlist, getWishlistProductIds } from "@/services/wishlist";

/** GET /api/customers/wishlist — saved product ids. */
export const GET = route(async (req) => {
  const user = await requireUser(req);
  return ok({ productIds: await getWishlistProductIds(user.id) });
});

/** POST /api/customers/wishlist — add one or more products (also used to merge a guest wishlist). */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const { productIds } = await parseJson(req, z.object({ productIds: z.array(z.string().uuid()).max(200) }));
  return ok({ productIds: await addToWishlist(user.id, productIds) });
});

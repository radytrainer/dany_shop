import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { cartItemsSchema } from "@/lib/validations/cart";
import { mergeUserCart } from "@/services/cart";

/** POST /api/cart/merge — merge a guest cart into the customer's saved cart after login. */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const { items } = await parseJson(req, z.object({ items: cartItemsSchema }));
  return ok({ items: await mergeUserCart(user.id, items) });
});

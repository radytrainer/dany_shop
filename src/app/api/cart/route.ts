import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { cartItemsSchema } from "@/lib/validations/cart";
import { getUserCartItems, setUserCartItems } from "@/services/cart";

/** GET /api/cart — the signed-in customer's saved cart. */
export const GET = route(async (req) => {
  const user = await requireUser(req);
  return ok({ items: await getUserCartItems(user.id) });
});

/** PUT /api/cart — replace the signed-in customer's saved cart. */
export const PUT = route(async (req) => {
  const user = await requireUser(req);
  const { items } = await parseJson(req, z.object({ items: cartItemsSchema }));
  return ok({ items: await setUserCartItems(user.id, items) });
});

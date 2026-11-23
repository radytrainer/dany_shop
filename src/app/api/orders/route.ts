import { ok, parseJson, route } from "@/lib/api";
import { getRequestUser } from "@/lib/auth";
import { assertSameOrigin, enforceRateLimit } from "@/lib/security";
import { checkoutSchema } from "@/lib/validations/checkout";
import { getLocale } from "@/i18n/server";
import { createOrder } from "@/services/orders";

/**
 * POST /api/orders — submit an order (no payment).
 * Server re-validates customer data, stock, prices, coupon and delivery; saves the order as PENDING.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "order");
  const input = await parseJson(req, checkoutSchema);
  const user = await getRequestUser(req);
  const created = await createOrder(input, { userId: user?.id ?? null, locale: await getLocale() });
  return ok(
    {
      orderNumber: created.orderNumber,
      accessToken: created.accessToken,
      confirmationUrl: `/orders/${created.orderNumber}?token=${encodeURIComponent(created.accessToken)}`,
    },
    { status: 201 },
  );
});

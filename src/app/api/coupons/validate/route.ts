import { ok, parseJson, route } from "@/lib/api";
import { assertSameOrigin, enforceRateLimit } from "@/lib/security";
import { couponValidateSchema } from "@/lib/validations/cart";
import { getLocale } from "@/i18n/server";
import { priceCart } from "@/services/cart";

/** POST /api/coupons/validate — validate a coupon against the current cart (server-calculated discount). */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "coupon");
  const { code, items } = await parseJson(req, couponValidateSchema);
  const quote = await priceCart({ items, couponCode: code, locale: await getLocale() });
  return ok({ coupon: quote.coupon, discountCents: quote.discountCents });
});

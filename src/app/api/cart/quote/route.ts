import { ok, parseJson, route } from "@/lib/api";
import { assertSameOrigin, enforceRateLimit } from "@/lib/security";
import { quoteRequestSchema } from "@/lib/validations/cart";
import { getLocale } from "@/i18n/server";
import { priceCart, toPublicQuote } from "@/services/cart";

/** POST /api/cart/quote — server-side pricing, availability and totals for a cart. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "quote");
  const body = await parseJson(req, quoteRequestSchema);
  const quote = await priceCart({ ...body, locale: await getLocale() });
  return ok(toPublicQuote(quote));
});

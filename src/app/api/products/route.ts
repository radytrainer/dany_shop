import { ok, parseQuery, route } from "@/lib/api";
import { productQuerySchema } from "@/lib/validations/catalog";
import { getLocale } from "@/i18n/server";
import { listProducts } from "@/services/catalog";

/** GET /api/products — filtered, sorted, paginated product listing. */
export const GET = route(async (req) => {
  const query = parseQuery(req, productQuerySchema);
  const listing = await listProducts(query, await getLocale());
  return ok(listing, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
});

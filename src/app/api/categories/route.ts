import { ok, route } from "@/lib/api";
import { getLocale } from "@/i18n/server";
import { getCategoryTree } from "@/services/catalog";

/** GET /api/categories — active category tree (localized). */
export const GET = route(async () => {
  return ok(await getCategoryTree(await getLocale()), {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
});

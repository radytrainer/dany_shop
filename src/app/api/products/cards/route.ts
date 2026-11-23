import { z } from "zod";
import { ok, parseQuery, route } from "@/lib/api";
import { getLocale } from "@/i18n/server";
import { getProductCardsByIds, getProductCardsBySlugs } from "@/services/catalog";

const schema = z.object({
  slugs: z.string().max(2000).optional(),
  ids: z.string().max(4000).optional(),
});

const split = (s?: string) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);

/** GET /api/products/cards?slugs=a,b | ?ids=… — product cards (recently viewed, wishlist). */
export const GET = route(async (req) => {
  const { slugs, ids } = parseQuery(req, schema);
  const locale = await getLocale();
  const idList = split(ids).filter((id) => z.string().uuid().safeParse(id).success);
  const items = idList.length ? await getProductCardsByIds(idList, locale) : await getProductCardsBySlugs(split(slugs), locale);
  return ok(items);
});

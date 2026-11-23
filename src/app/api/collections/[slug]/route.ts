import { notFound, ok, route } from "@/lib/api";
import { getLocale } from "@/i18n/server";
import { getCollectionBySlug, getCollectionProducts } from "@/services/content";
import { getStoreSettings } from "@/services/settings";

/** GET /api/collections/[slug] — collection with its curated products. */
export const GET = route<RouteContext<"/api/collections/[slug]">>(async (_req, ctx) => {
  const { slug } = await ctx.params;
  const locale = await getLocale();
  const collection = (await getStoreSettings()).showCollections ? await getCollectionBySlug(slug, locale) : null;
  if (!collection) throw notFound("Collection not found");
  return ok({ ...collection, products: await getCollectionProducts(collection.id, locale, 60) });
});

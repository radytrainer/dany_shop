import { notFound, ok, route } from "@/lib/api";
import { getLocale } from "@/i18n/server";
import { getProductBySlug } from "@/services/catalog";

/** GET /api/products/[slug] — product details with variants and live availability. */
export const GET = route<RouteContext<"/api/products/[slug]">>(async (_req, ctx) => {
  const { slug } = await ctx.params;
  const product = await getProductBySlug(slug, await getLocale());
  if (!product) throw notFound("Product not found");
  return ok(product);
});

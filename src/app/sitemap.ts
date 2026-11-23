import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getVisibleCategoryIds } from "@/services/catalog";
import { getStoreSettings } from "@/services/settings";

// Generated per request (cached by the CDN/proxy) so builds never need a database.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const visible = await getVisibleCategoryIds();
  const { showCollections } = await getStoreSettings();
  const [products, categories, collections] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE", categoryId: { in: visible } }, select: { slug: true, updatedAt: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } }),
    prisma.category.findMany({ where: { id: { in: visible } }, select: { slug: true, updatedAt: true } }),
    prisma.collection.findMany({ where: { isActive: true, ...(showCollections ? {} : { id: { in: [] } }) }, select: { slug: true, updatedAt: true } }),
  ]);
  const abs = (u: string) => (u.startsWith("http") ? u : `${base}${u}`);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    ...(showCollections ? [{ url: `${base}/collections`, changeFrequency: "weekly" as const, priority: 0.7 }] : []),
    ...["how-to-order", "shipping", "size-guide"].map((t) => ({ url: `${base}/help/${t}`, changeFrequency: "monthly" as const, priority: 0.3 })),
    ...categories.map((c) => ({ url: `${base}/categories/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "daily" as const, priority: 0.8 })),
    ...collections.map((c) => ({ url: `${base}/collections/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.images.map((i) => abs(i.url)),
    })),
  ];
}

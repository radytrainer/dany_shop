import "server-only";
import { cache } from "react";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { storefrontCache } from "@/lib/shared-cache";
import type { Locale } from "@/i18n/config";
import type { BannerPlacement } from "@/generated/prisma/enums";
import { getPricingContext, getProductCardsByIds, getVisibleCategoryIds } from "./catalog";
import { getStoreSettings } from "./settings";

const trSchema = z.record(z.string(), z.record(z.string(), z.string())).catch({});

export function pickTranslation<T extends Record<string, unknown>>(base: T, translations: unknown, locale: Locale): T {
  const tr = trSchema.parse(translations)[locale];
  if (!tr) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(tr)) if (v && k in base) out[k] = v;
  return out as T;
}

export type BannerDTO = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaHref: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
};

/** Active banners of a placement (cached; the schedule window is checked per request). */
const loadBannerRows = storefrontCache(async (placement: BannerPlacement) => {
  const rows = await prisma.banner.findMany({ where: { placement, isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  return rows.map((b) => ({ ...b, startsAt: b.startsAt?.toISOString() ?? null, endsAt: b.endsAt?.toISOString() ?? null, createdAt: null, updatedAt: null }));
}, "banners");

export const getBanners = cache(async (placement: BannerPlacement, locale: Locale): Promise<BannerDTO[]> => {
  const now = Date.now();
  const { showCollections } = await getStoreSettings();
  const href = (h: string | null) => (!showCollections && h?.startsWith("/collections") ? null : h);
  const rows = (await loadBannerRows(placement)).filter(
    (b) => (!b.startsAt || Date.parse(b.startsAt) <= now) && (!b.endsAt || Date.parse(b.endsAt) >= now),
  );
  return rows.map((b) =>
    pickTranslation(
      {
        id: b.id,
        title: b.title,
        subtitle: b.subtitle,
        description: b.description,
        ctaLabel: b.ctaLabel,
        ctaHref: href(b.ctaHref),
        secondaryCtaLabel: b.secondaryCtaLabel,
        secondaryCtaHref: href(b.secondaryCtaHref),
        imageUrl: b.imageUrl,
        mobileImageUrl: b.mobileImageUrl,
      },
      b.translations,
      locale,
    ),
  );
});

export type CollectionDTO = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  productCount: number;
};

export const listCollections = cache((locale: Locale, featuredOnly = false) => loadCollections(locale, featuredOnly));

const loadCollections = storefrontCache(async (locale: Locale, featuredOnly: boolean): Promise<CollectionDTO[]> => {
  const visibleCategories = await getVisibleCategoryIds();
  const rows = await prisma.collection.findMany({
    where: { isActive: true, ...(featuredOnly ? { isFeatured: true } : {}) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { product: { status: "ACTIVE", categoryId: { in: visibleCategories } } } } } } },
  });
  return rows.map((c) => ({
    ...pickTranslation(
      { id: c.id, slug: c.slug, name: c.name, description: c.description, imageUrl: c.imageUrl, bannerUrl: c.bannerUrl },
      c.translations,
      locale,
    ),
    productCount: c._count.products,
  }));
}, "collections");

export async function getCollectionBySlug(slug: string, locale: Locale): Promise<CollectionDTO | null> {
  const all = await listCollections(locale);
  return all.find((c) => c.slug === slug) ?? null;
}

/** Products of a collection in curated order. */
export async function getCollectionProducts(collectionId: string, locale: Locale, take = 12) {
  await getPricingContext();
  const links = await prisma.collectionProduct.findMany({
    where: { collectionId, product: { status: "ACTIVE" } },
    orderBy: { sortOrder: "asc" },
    take,
    select: { productId: true },
  });
  return getProductCardsByIds(links.map((l) => l.productId), locale);
}

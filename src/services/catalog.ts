import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { computeUnitPrice, discountPercent, isWithinWindow, type PromotionRule } from "@/lib/calculations/pricing";
import type { Locale } from "@/i18n/config";
import { translated } from "@/lib/translations";
import { buildProductQuery, type ProductQuery } from "@/lib/validations/catalog";
import type {
  CategoryNode,
  ColorSwatch,
  ListingFacets,
  ProductCardDTO,
  ProductDetailDTO,
  SizeOption,
  SortKey,
} from "@/types/catalog";

// ───────────────────────────── Pricing context ─────────────────────────────

export type PricingContext = {
  promotions: PromotionRule[];
  /** categoryId → [categoryId, parentId, grandparentId, …] */
  ancestors: Map<string, string[]>;
};

export const getPricingContext = cache(async (): Promise<PricingContext> => {
  const [promos, cats] = await Promise.all([
    prisma.promotion.findMany({
      where: { isActive: true },
      include: { categories: { select: { id: true } }, products: { select: { id: true } } },
    }),
    prisma.category.findMany({ select: { id: true, parentId: true } }),
  ]);
  const now = new Date();
  const promotions: PromotionRule[] = promos
    .filter((p) => isWithinWindow(now, p.startsAt, p.endsAt))
    .map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      value: p.value.toFixed(2),
      scope: p.scope,
      categoryIds: p.categories.map((c) => c.id),
      productIds: p.products.map((x) => x.id),
      startsAt: p.startsAt,
      endsAt: p.endsAt,
      isActive: p.isActive,
    }));
  const parentOf = new Map(cats.map((c) => [c.id, c.parentId]));
  const ancestors = new Map<string, string[]>();
  for (const c of cats) {
    const chain: string[] = [];
    let cur: string | null | undefined = c.id;
    while (cur && !chain.includes(cur)) {
      chain.push(cur);
      cur = parentOf.get(cur);
    }
    ancestors.set(c.id, chain);
  }
  return { promotions, ancestors };
});

export function priceFor(
  ctx: PricingContext,
  product: { id: string; categoryId: string; price: Prisma.Decimal; salePrice: Prisma.Decimal | null },
  variantOverride: Prisma.Decimal | null = null,
) {
  return computeUnitPrice(
    {
      productId: product.id,
      categoryIds: ctx.ancestors.get(product.categoryId) ?? [product.categoryId],
      price: product.price.toFixed(2),
      salePrice: product.salePrice?.toFixed(2) ?? null,
      variantPriceOverride: variantOverride?.toFixed(2) ?? null,
    },
    ctx.promotions,
  );
}

// ───────────────────────────── Categories ─────────────────────────────

/**
 * Categories shoppers can see: active, and every ancestor active. Products in hidden categories
 * (e.g. a deactivated "Accessories") disappear from listings, search, rails and product pages,
 * and cannot be ordered. Re-activating the category brings them back.
 */
export const getVisibleCategoryIds = cache(async (): Promise<string[]> => {
  const cats = await prisma.category.findMany({ select: { id: true, parentId: true, isActive: true } });
  const byId = new Map(cats.map((c) => [c.id, c]));
  const visible = (id: string) => {
    const seen = new Set<string>();
    let cur = byId.get(id);
    while (cur) {
      if (!cur.isActive || seen.has(cur.id)) return false;
      if (!cur.parentId) return true;
      seen.add(cur.id);
      cur = byId.get(cur.parentId);
    }
    return false;
  };
  return cats.filter((c) => visible(c.id)).map((c) => c.id);
});

export const getCategoryTree = cache(async (locale: Locale): Promise<CategoryNode[]> => {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { translations: { where: { locale } } },
  });
  const nodes = new Map<string, CategoryNode>();
  for (const r of rows) {
    const tr = r.translations[0];
    nodes.set(r.id, {
      id: r.id,
      slug: r.slug,
      name: tr?.name || r.name,
      description: tr?.description || r.description,
      imageUrl: r.imageUrl,
      bannerUrl: r.bannerUrl,
      parentId: r.parentId,
      isFeatured: r.isFeatured,
      children: [],
    });
  }
  const roots: CategoryNode[] = [];
  for (const n of nodes.values()) {
    if (n.parentId && nodes.has(n.parentId)) nodes.get(n.parentId)!.children.push(n);
    else if (!n.parentId) roots.push(n);
  }
  return roots;
});

export function findCategory(tree: CategoryNode[], slug: string): { node: CategoryNode; path: CategoryNode[] } | null {
  for (const root of tree) {
    if (root.slug === slug) return { node: root, path: [root] };
    const found = findCategory(root.children, slug);
    if (found) return { node: found.node, path: [root, ...found.path] };
  }
  return null;
}

export function descendantIds(node: CategoryNode): string[] {
  return [node.id, ...node.children.flatMap(descendantIds)];
}

// ───────────────────────────── Product cards ─────────────────────────────

const cardSelect = (locale: Locale) =>
  ({
    id: true,
    slug: true,
    name: true,
    categoryId: true,
    price: true,
    salePrice: true,
    currency: true,
    isNewArrival: true,
    condition: true,
    images: { orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }], take: 2, select: { url: true } },
    variants: {
      where: { isActive: true },
      select: { stock: true, reserved: true, color: { select: { id: true, name: true, hex: true, sortOrder: true, translations: true } } },
    },
    translations: { where: { locale }, select: { name: true } },
  }) satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: ReturnType<typeof cardSelect> }>;

function toCard(p: CardRow, ctx: PricingContext, locale: Locale): ProductCardDTO {
  const price = priceFor(ctx, p);
  const colors = new Map<string, ColorSwatch & { sortOrder: number }>();
  for (const v of p.variants) colors.set(v.color.id, { id: v.color.id, name: v.color.name, hex: v.color.hex, sortOrder: v.color.sortOrder, label: translated(v.color.name, v.color.translations, locale) });
  return {
    id: p.id,
    slug: p.slug,
    name: p.translations[0]?.name || p.name,
    imageUrl: p.images[0]?.url ?? null,
    hoverImageUrl: p.images[1]?.url ?? null,
    priceCents: price.unitCents,
    compareAtCents: price.compareAtCents,
    discountPercent: discountPercent(price.unitCents, price.compareAtCents),
    currency: p.currency,
    isNew: p.isNewArrival,
    condition: p.condition,
    inStock: p.variants.some((v) => v.stock - v.reserved > 0),
    colors: [...colors.values()].sort((a, b) => a.sortOrder - b.sortOrder).map(({ id, name, hex, label }) => ({ id, name, hex, label })),
  };
}

const ORDER_BY: Record<SortKey, Prisma.ProductOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }, { id: "asc" }],
  price_asc: [{ sortPrice: "asc" }, { id: "asc" }],
  price_desc: [{ sortPrice: "desc" }, { id: "asc" }],
  popular: [{ viewCount: "desc" }, { id: "asc" }],
  best: [{ soldCount: "desc" }, { id: "asc" }],
};

async function scopeWhere(query: Pick<ProductQuery, "category" | "collection" | "q">, locale: Locale) {
  const and: Prisma.ProductWhereInput[] = [{ status: "ACTIVE" }, { categoryId: { in: await getVisibleCategoryIds() } }];
  if (query.category) {
    const found = findCategory(await getCategoryTree(locale), query.category);
    // Unknown/inactive category → match nothing rather than everything.
    and.push({ categoryId: { in: found ? descendantIds(found.node) : [] } });
  }
  if (query.collection) {
    and.push({ collections: { some: { collection: { slug: query.collection, isActive: true } } } });
  }
  if (query.q) {
    const q = query.q;
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { variants: { some: { sku: { equals: q, mode: "insensitive" } } } },
        { tags: { has: q.toLowerCase() } },
        { brand: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { category: { parent: { name: { contains: q, mode: "insensitive" } } } },
        { translations: { some: { name: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  return and;
}

async function buildWhere(query: ProductQuery, locale: Locale): Promise<Prisma.ProductWhereInput> {
  const and = await scopeWhere(query, locale);

  if (query.sizes.length || query.colors.length || query.inStock) {
    and.push({
      variants: {
        some: {
          isActive: true,
          ...(query.sizes.length ? { size: { name: { in: query.sizes } } } : {}),
          ...(query.colors.length ? { color: { name: { in: query.colors } } } : {}),
          ...(query.inStock ? { stock: { gt: prisma.productVariant.fields.reserved } } : {}),
        },
      },
    });
  }
  if (query.minPrice) and.push({ sortPrice: { gte: query.minPrice } });
  if (query.maxPrice) and.push({ sortPrice: { lte: query.maxPrice } });
  if (query.brands.length) and.push({ brand: { in: query.brands } });
  if (query.new) and.push({ isNewArrival: true });
  if (query.sale) {
    const { promotions } = await getPricingContext();
    if (!promotions.some((p) => p.scope === "ALL")) {
      const promoCats = promotions.filter((p) => p.scope === "CATEGORY").flatMap((p) => p.categoryIds);
      const promoProducts = promotions.filter((p) => p.scope === "PRODUCT").flatMap((p) => p.productIds);
      const tree = await getCategoryTree(locale);
      const catIds = promoCats.flatMap((id) => {
        const walk = (nodes: CategoryNode[]): CategoryNode | null => {
          for (const n of nodes) {
            if (n.id === id) return n;
            const f = walk(n.children);
            if (f) return f;
          }
          return null;
        };
        const node = walk(tree);
        return node ? descendantIds(node) : [id];
      });
      and.push({
        OR: [{ salePrice: { not: null } }, { id: { in: promoProducts } }, { categoryId: { in: catIds } }],
      });
    }
  }
  return { AND: and };
}

export type ProductListing = {
  items: ProductCardDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listProducts(query: ProductQuery, locale: Locale): Promise<ProductListing> {
  const [where, ctx] = await Promise.all([buildWhere(query, locale), getPricingContext()]);
  const sort = (query.sort as SortKey) ?? "newest";
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: ORDER_BY[sort],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: cardSelect(locale),
    }),
  ]);
  return {
    items: rows.map((r) => toCard(r, ctx, locale)),
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/** Filter options available within the current scope (category / collection / search). */
export async function getListingFacets(
  query: Pick<ProductQuery, "category" | "collection" | "q">,
  locale: Locale,
): Promise<ListingFacets> {
  const base: Prisma.ProductWhereInput = { AND: await scopeWhere(query, locale) };
  const variantScope = { some: { isActive: true, product: base } };
  const [sizes, colors, brands, agg] = await Promise.all([
    prisma.size.findMany({ where: { variants: variantScope }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, translations: true } }),
    prisma.color.findMany({ where: { variants: variantScope }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, hex: true, translations: true } }),
    prisma.product.findMany({ where: { ...base, brand: { not: null } }, distinct: ["brand"], select: { brand: true }, orderBy: { brand: "asc" } }),
    prisma.product.aggregate({ where: base, _min: { sortPrice: true }, _max: { sortPrice: true } }),
  ]);
  return {
    sizes: sizes.map((x) => ({ id: x.id, name: x.name, label: translated(x.name, x.translations, locale) })),
    colors: colors.map((x) => ({ id: x.id, name: x.name, hex: x.hex, label: translated(x.name, x.translations, locale) })),
    brands: brands.map((b) => b.brand!).filter(Boolean),
    priceMin: Math.floor(Number(agg._min.sortPrice?.toFixed(0) ?? 0)),
    priceMax: Math.ceil(Number(agg._max.sortPrice?.toFixed(2) ?? 0)),
  };
}

/** Curated home/listing rails. */
export async function getProductRail(
  kind: "new" | "best" | "trending" | "sale" | "featured",
  locale: Locale,
  take = 8,
): Promise<ProductCardDTO[]> {
  const ctx = await getPricingContext();
  const visibleCategories = await getVisibleCategoryIds();
  const where: Prisma.ProductWhereInput = { status: "ACTIVE", categoryId: { in: visibleCategories } };
  let orderBy: Prisma.ProductOrderByWithRelationInput[] = ORDER_BY.newest;
  if (kind === "new") where.isNewArrival = true;
  if (kind === "best") {
    where.isBestSeller = true;
    orderBy = ORDER_BY.best;
  }
  if (kind === "featured") where.isFeatured = true;
  if (kind === "trending") orderBy = ORDER_BY.popular;
  if (kind === "sale") {
    const listing = await listProducts(
      buildProductQuery({ sale: true, pageSize: take }),
      locale,
    );
    return listing.items;
  }
  let rows = await prisma.product.findMany({ where, orderBy, take, select: cardSelect(locale) });
  // Fall back to newest products so rails never render empty when flags aren't set yet.
  if (rows.length === 0 && kind !== "featured") {
    rows = await prisma.product.findMany({ where: { status: "ACTIVE", categoryId: { in: visibleCategories } }, orderBy: ORDER_BY.newest, take, select: cardSelect(locale) });
  }
  return rows.map((r) => toCard(r, ctx, locale));
}

export async function getProductCardsByIds(ids: string[], locale: Locale): Promise<ProductCardDTO[]> {
  if (ids.length === 0) return [];
  const ctx = await getPricingContext();
  const rows = await prisma.product.findMany({
    where: { id: { in: ids.slice(0, 60) }, status: "ACTIVE", categoryId: { in: await getVisibleCategoryIds() } },
    select: cardSelect(locale),
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.map((r) => toCard(r, ctx, locale)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function getProductCardsBySlugs(slugs: string[], locale: Locale): Promise<ProductCardDTO[]> {
  if (slugs.length === 0) return [];
  const ctx = await getPricingContext();
  const rows = await prisma.product.findMany({
    where: { slug: { in: slugs.slice(0, 24) }, status: "ACTIVE", categoryId: { in: await getVisibleCategoryIds() } },
    select: cardSelect(locale),
  });
  const order = new Map(slugs.map((s, i) => [s, i]));
  return rows.map((r) => toCard(r, ctx, locale)).sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
}

// ───────────────────────────── Product detail ─────────────────────────────

export const getProductBySlug = cache(async (slug: string, locale: Locale): Promise<ProductDetailDTO | null> => {
  const p = await prisma.product.findFirst({
    where: { slug, status: "ACTIVE", categoryId: { in: await getVisibleCategoryIds() } },
    include: {
      images: { orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }] },
      variants: {
        where: { isActive: true },
        include: { size: true, color: true },
      },
      translations: { where: { locale } },
      category: { include: { translations: { where: { locale } } } },
    },
  });
  if (!p) return null;
  const ctx = await getPricingContext();
  const tree = await getCategoryTree(locale);
  const found = findCategory(tree, p.category.slug);

  const sizes = new Map<string, SizeOption & { sortOrder: number }>();
  const colors = new Map<string, ColorSwatch & { sortOrder: number }>();
  for (const v of p.variants) {
    sizes.set(v.size.id, { id: v.size.id, name: v.size.name, label: translated(v.size.name, v.size.translations, locale), sortOrder: v.size.sortOrder });
    colors.set(v.color.id, { id: v.color.id, name: v.color.name, hex: v.color.hex, label: translated(v.color.name, v.color.translations, locale), sortOrder: v.color.sortOrder });
  }
  const base = priceFor(ctx, p);
  const tr = p.translations[0];
  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: tr?.name || p.name,
    shortDescription: tr?.shortDescription || p.shortDescription,
    description: tr?.description || p.description,
    brand: p.brand,
    tags: p.tags,
    currency: p.currency,
    isNew: p.isNewArrival,
    condition: p.condition,
    priceCents: base.unitCents,
    compareAtCents: base.compareAtCents,
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, colorId: i.colorId })),
    sizes: [...sizes.values()].sort((a, b) => a.sortOrder - b.sortOrder).map(({ id, name, label }) => ({ id, name, label })),
    colors: [...colors.values()].sort((a, b) => a.sortOrder - b.sortOrder).map(({ id, name, hex, label }) => ({ id, name, hex, label })),
    variants: p.variants.map((v) => {
      const price = priceFor(ctx, p, v.priceOverride);
      return {
        id: v.id,
        sku: v.sku,
        sizeId: v.sizeId,
        colorId: v.colorId,
        available: Math.max(0, v.stock - v.reserved),
        priceCents: price.unitCents,
        compareAtCents: price.compareAtCents,
      };
    }),
    lowStockThreshold: p.lowStockThreshold,
    category: { id: p.category.id, slug: p.category.slug, name: p.category.translations[0]?.name || p.category.name },
    breadcrumbs: (found?.path ?? []).map((c) => ({ slug: c.slug, name: c.name })),
  };
});

export async function getRelatedProducts(product: ProductDetailDTO, locale: Locale, take = 8) {
  const ctx = await getPricingContext();
  const rows = await prisma.product.findMany({
    where: { status: "ACTIVE", id: { not: product.id }, categoryId: product.category.id },
    orderBy: ORDER_BY.best,
    take,
    select: cardSelect(locale),
  });
  let cards = rows.map((r) => toCard(r, ctx, locale));
  if (cards.length < 4) {
    // Widen to the parent category tree.
    const rootSlug = product.breadcrumbs[0]?.slug;
    if (rootSlug) {
      const listing = await listProducts(
        buildProductQuery({ category: rootSlug, sort: "best", pageSize: take + 1 }),
        locale,
      );
      const seen = new Set(cards.map((c) => c.id));
      cards = [...cards, ...listing.items.filter((c) => c.id !== product.id && !seen.has(c.id))].slice(0, take);
    }
  }
  return cards;
}

/** Fire-and-forget popularity counter. */
export function recordProductView(productId: string) {
  prisma.product
    .update({ where: { id: productId }, data: { viewCount: { increment: 1 } } })
    .catch(() => undefined);
}

// ───────────────────────────── Search suggestions ─────────────────────────────

export async function searchSuggestions(q: string, locale: Locale) {
  const [listing, tree] = await Promise.all([
    listProducts(buildProductQuery({ q, sort: "popular", pageSize: 6 }), locale),
    getCategoryTree(locale),
  ]);
  const needle = q.toLowerCase();
  const flat: { slug: string; name: string; parent: string | null }[] = [];
  const walk = (nodes: CategoryNode[], parent: string | null) => {
    for (const n of nodes) {
      flat.push({ slug: n.slug, name: n.name, parent });
      walk(n.children, n.name);
    }
  };
  walk(tree, null);
  const categories = flat.filter((c) => c.name.toLowerCase().includes(needle)).slice(0, 5);
  return { products: listing.items, total: listing.total, categories };
}

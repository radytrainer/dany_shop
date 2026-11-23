import "server-only";
import { prisma, type Tx } from "@/lib/prisma";
import { computeCartTotals, type CouponRule, type DeliveryRule } from "@/lib/calculations/pricing";
import { toCents } from "@/lib/money";
import { translated } from "@/lib/translations";
import type { Locale } from "@/i18n/config";
import type { CartQuote, CouponStatus, QuotedLine } from "@/types/cart";
import { getPricingContext, getVisibleCategoryIds, priceFor } from "./catalog";
import { getStoreSettings } from "./settings";

type Db = typeof prisma | Tx;

export type CartInput = {
  items: { variantId: string; quantity: number }[];
  couponCode?: string | null;
  deliveryMethodId?: string | null;
  locale?: Locale;
};

/** Merge duplicate variants and clamp quantities. */
export function normalizeItems(items: { variantId: string; quantity: number }[]) {
  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.variantId, Math.min(99, (merged.get(i.variantId) ?? 0) + i.quantity));
  return [...merged.entries()].map(([variantId, quantity]) => ({ variantId, quantity })).slice(0, 50);
}

export async function loadCouponRule(db: Db, code: string): Promise<CouponRule | null> {
  const c = await db.coupon.findUnique({
    where: { code: code.toUpperCase() },
    include: { categories: { select: { id: true } }, products: { select: { id: true } } },
  });
  if (!c) return null;
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value.toFixed(2),
    scope: c.scope,
    categoryIds: c.categories.map((x) => x.id),
    productIds: c.products.map((x) => x.id),
    minOrderAmount: c.minOrderAmount?.toFixed(2) ?? null,
    maxDiscount: c.maxDiscount?.toFixed(2) ?? null,
    startsAt: c.startsAt,
    expiresAt: c.expiresAt,
    usageLimit: c.usageLimit,
    usageCount: c.usageCount,
    isActive: c.isActive,
  };
}

export async function loadDeliveryRule(db: Db, id: string | null | undefined): Promise<(DeliveryRule & { isActive: boolean }) | null> {
  if (!id) return null;
  const d = await db.deliveryMethod.findUnique({ where: { id } });
  if (!d) return null;
  return { id: d.id, name: d.name, fee: d.fee.toFixed(2), freeOverAmount: d.freeOverAmount?.toFixed(2) ?? null, isActive: d.isActive };
}

/**
 * Authoritative cart pricing from current database state.
 * Never trusts client prices; reports availability issues per line.
 */
export async function priceCart(input: CartInput, db: Db = prisma): Promise<CartQuote & { couponRule: CouponRule | null; deliveryName: string | null }> {
  const locale = input.locale ?? "en";
  const items = normalizeItems(input.items);
  const [settings, ctx] = await Promise.all([getStoreSettings(), getPricingContext()]);

  const variants = items.length
    ? await db.productVariant.findMany({
        where: { id: { in: items.map((i) => i.variantId) } },
        include: {
          size: true,
          color: true,
          product: {
            include: {
              images: { orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }], take: 1 },
              translations: { where: { locale } },
            },
          },
        },
      })
    : [];
  const byId = new Map(variants.map((v) => [v.id, v]));
  const visibleCategories = new Set(await getVisibleCategoryIds());

  const lines: QuotedLine[] = [];
  for (const item of items) {
    const v = byId.get(item.variantId);
    if (!v) continue; // deleted variant: drop silently, client will reconcile
    const product = v.product;
    const available = Math.max(0, v.stock - v.reserved);
    const price = priceFor(ctx, product, v.priceOverride);
    let issue: QuotedLine["issue"] = null;
    if (!v.isActive || product.status !== "ACTIVE" || !visibleCategories.has(product.categoryId)) issue = "UNAVAILABLE";
    else if (available <= 0) issue = "OUT_OF_STOCK";
    else if (item.quantity > available) issue = "INSUFFICIENT";
    lines.push({
      variantId: v.id,
      productId: product.id,
      slug: product.slug,
      name: product.translations[0]?.name || product.name,
      imageUrl: product.images[0]?.url ?? null,
      sku: v.sku,
      sizeName: translated(v.size.name, v.size.translations, locale),
      colorName: translated(v.color.name, v.color.translations, locale),
      colorHex: v.color.hex,
      unitCents: price.unitCents,
      compareAtCents: price.compareAtCents,
      quantity: item.quantity,
      available,
      lineTotalCents: price.unitCents * item.quantity,
      issue,
    });
  }

  // Totals are computed on orderable lines only (quantity clamped to what is available).
  const orderable = lines
    .filter((l) => l.issue === null || l.issue === "INSUFFICIENT")
    .map((l) => {
      const product = byId.get(l.variantId)!.product;
      return {
        productId: l.productId,
        categoryIds: ctx.ancestors.get(product.categoryId) ?? [product.categoryId],
        unitCents: l.unitCents,
        quantity: Math.min(l.quantity, l.available),
      };
    });

  const couponRule = input.couponCode ? await loadCouponRule(db, input.couponCode) : null;
  const delivery = await loadDeliveryRule(db, input.deliveryMethodId);
  const activeDelivery = delivery && delivery.isActive ? delivery : null;

  const totals = computeCartTotals({
    lines: orderable,
    coupon: couponRule,
    delivery: activeDelivery,
    tax: { enabled: settings.taxEnabled, rate: settings.taxRate },
  });

  let coupon: CouponStatus | null = null;
  if (input.couponCode) {
    if (!couponRule) coupon = { code: input.couponCode.toUpperCase(), ok: false, reason: "INVALID" };
    else if (totals.coupon && !totals.coupon.ok)
      coupon = { code: couponRule.code, ok: false, reason: totals.coupon.reason, minOrderCents: totals.coupon.minOrderCents };
    else coupon = { code: couponRule.code, ok: true, reason: null };
  }

  return {
    currency: settings.currency,
    lines,
    subtotalCents: totals.subtotalCents,
    discountCents: totals.discountCents,
    deliveryCents: totals.deliveryCents,
    taxCents: totals.taxCents,
    grandTotalCents: totals.grandTotalCents,
    coupon,
    deliveryMethodId: activeDelivery?.id ?? null,
    minOrderCents: settings.minOrderAmount ? toCents(settings.minOrderAmount) : null,
    hasIssues: lines.some((l) => l.issue !== null),
    couponRule: coupon?.ok ? couponRule : null,
    deliveryName: activeDelivery?.name ?? null,
  };
}

/** Strip server-only fields before sending a quote to the browser. */
export function toPublicQuote(q: Awaited<ReturnType<typeof priceCart>>): CartQuote {
  const { couponRule: _c, deliveryName: _d, ...rest } = q;
  return rest;
}

// ───────────────────────────── Persistent cart (signed-in customers) ─────────────────────────────

export async function getUserCartItems(userId: string) {
  const cart = await prisma.cart.findUnique({ where: { userId }, include: { items: { orderBy: { createdAt: "asc" } } } });
  return cart?.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })) ?? [];
}

/** Replace the user's server cart with the given items (only existing variants are kept). */
export async function setUserCartItems(userId: string, items: { variantId: string; quantity: number }[]) {
  const normalized = normalizeItems(items);
  const existing = await prisma.productVariant.findMany({
    where: { id: { in: normalized.map((i) => i.variantId) } },
    select: { id: true },
  });
  const valid = new Set(existing.map((v) => v.id));
  const keep = normalized.filter((i) => valid.has(i.variantId));
  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({ where: { userId }, update: {}, create: { userId } });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    if (keep.length) await tx.cartItem.createMany({ data: keep.map((i) => ({ cartId: cart.id, ...i })) });
  });
  return keep;
}

/** Merge a guest cart into the user's saved cart (quantities add up, capped at 99). */
export async function mergeUserCart(userId: string, guestItems: { variantId: string; quantity: number }[]) {
  const saved = await getUserCartItems(userId);
  return setUserCartItems(userId, [...saved, ...guestItems]);
}

import "server-only";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { conflict, notFound } from "@/lib/api";
import type {
  bannerInputSchema,
  collectionInputSchema,
  colorInputSchema,
  couponInputSchema,
  deliveryMethodInputSchema,
  promotionInputSchema,
  settingsInputSchema,
  sizeInputSchema,
} from "@/lib/validations/admin";
import { logAdminActivity } from "./audit";

type Actor = { id: string; ip?: string | null };
const audit = (u: Actor, action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) =>
  logAdminActivity({ userId: u.id, action, entityType, entityId, metadata: metadata as never, ip: u.ip });

// ───────────────────────────── Coupons ─────────────────────────────

type CouponIn = z.infer<typeof couponInputSchema>;
const couponData = ({ categoryIds, productIds, ...c }: CouponIn) => ({
  ...c,
  categories: { set: c.scope === "CATEGORY" ? categoryIds.map((id) => ({ id })) : [] },
  products: { set: c.scope === "PRODUCT" ? productIds.map((id) => ({ id })) : [] },
});

export async function saveCoupon(input: CouponIn, u: Actor, id?: string) {
  const data = couponData(input);
  const coupon = id
    ? await prisma.coupon.update({ where: { id }, data })
    : await prisma.coupon.create({
        data: { ...data, categories: { connect: data.categories.set }, products: { connect: data.products.set } },
      });
  await audit(u, id ? "coupon.update" : "coupon.create", "Coupon", coupon.id, { code: coupon.code });
  return coupon;
}

export async function deleteCoupon(id: string, u: Actor) {
  const c = await prisma.coupon.findUnique({ where: { id }, include: { _count: { select: { orders: true } } } });
  if (!c) throw notFound("Coupon not found");
  if (c._count.orders > 0) {
    await prisma.coupon.update({ where: { id }, data: { isActive: false } });
    await audit(u, "coupon.deactivate", "Coupon", id, { code: c.code, reason: "Used in orders" });
    return "deactivated" as const;
  }
  await prisma.coupon.delete({ where: { id } });
  await audit(u, "coupon.delete", "Coupon", id, { code: c.code });
  return "deleted" as const;
}

// ───────────────────────────── Promotions ─────────────────────────────

type PromoIn = z.infer<typeof promotionInputSchema>;
export async function savePromotion(input: PromoIn, u: Actor, id?: string) {
  const { categoryIds, productIds, ...p } = input;
  const cats = p.scope === "CATEGORY" ? categoryIds.map((x) => ({ id: x })) : [];
  const prods = p.scope === "PRODUCT" ? productIds.map((x) => ({ id: x })) : [];
  const promo = id
    ? await prisma.promotion.update({ where: { id }, data: { ...p, categories: { set: cats }, products: { set: prods } } })
    : await prisma.promotion.create({ data: { ...p, categories: { connect: cats }, products: { connect: prods } } });
  await audit(u, id ? "promotion.update" : "promotion.create", "Promotion", promo.id, { name: promo.name });
  return promo;
}

export async function deletePromotion(id: string, u: Actor) {
  const p = await prisma.promotion.delete({ where: { id } });
  await audit(u, "promotion.delete", "Promotion", id, { name: p.name });
}

// ───────────────────────────── Banners ─────────────────────────────

type BannerIn = z.infer<typeof bannerInputSchema>;
export async function saveBanner(input: BannerIn, u: Actor, id?: string) {
  const { km, ...b } = input;
  const data = { ...b, translations: Object.keys(km).length ? { km } : {} };
  const banner = id ? await prisma.banner.update({ where: { id }, data }) : await prisma.banner.create({ data });
  await audit(u, id ? "banner.update" : "banner.create", "Banner", banner.id, { title: banner.title, placement: banner.placement });
  return banner;
}

export async function deleteBanner(id: string, u: Actor) {
  const b = await prisma.banner.delete({ where: { id } });
  await audit(u, "banner.delete", "Banner", id, { title: b.title });
}

// ───────────────────────────── Collections ─────────────────────────────

type CollectionIn = z.infer<typeof collectionInputSchema>;
export async function saveCollection(input: CollectionIn, u: Actor, id?: string) {
  const { km, productIds, ...c } = input;
  const clash = await prisma.collection.findFirst({ where: { slug: c.slug, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
  if (clash) throw conflict("Another collection already uses this slug.", "DUPLICATE");
  const collection = await prisma.$transaction(async (tx) => {
    const data = { ...c, translations: Object.keys(km).length ? { km } : {} };
    const saved = id ? await tx.collection.update({ where: { id }, data }) : await tx.collection.create({ data });
    await tx.collectionProduct.deleteMany({ where: { collectionId: saved.id } });
    if (productIds.length) {
      await tx.collectionProduct.createMany({ data: productIds.map((productId, i) => ({ collectionId: saved.id, productId, sortOrder: i })), skipDuplicates: true });
    }
    return saved;
  });
  await audit(u, id ? "collection.update" : "collection.create", "Collection", collection.id, { name: collection.name, products: productIds.length });
  return collection;
}

export async function deleteCollection(id: string, u: Actor) {
  const c = await prisma.collection.delete({ where: { id } });
  await audit(u, "collection.delete", "Collection", id, { name: c.name });
}

// ───────────────────────────── Delivery methods ─────────────────────────────

type DeliveryIn = z.infer<typeof deliveryMethodInputSchema>;
export async function saveDeliveryMethod(input: DeliveryIn, u: Actor, id?: string) {
  const { nameKm, estimatedDaysKm, ...d } = input;
  const km = { ...(nameKm ? { name: nameKm } : {}), ...(estimatedDaysKm ? { estimatedDays: estimatedDaysKm } : {}) };
  const data = { ...d, translations: Object.keys(km).length ? { km } : {} };
  const m = id ? await prisma.deliveryMethod.update({ where: { id }, data }) : await prisma.deliveryMethod.create({ data });
  await audit(u, id ? "delivery.update" : "delivery.create", "DeliveryMethod", m.id, { name: m.name, fee: m.fee.toFixed(2) });
  return m;
}

export async function deleteDeliveryMethod(id: string, u: Actor) {
  const used = await prisma.order.count({ where: { deliveryMethodId: id } });
  if (used > 0) {
    await prisma.deliveryMethod.update({ where: { id }, data: { isActive: false } });
    await audit(u, "delivery.deactivate", "DeliveryMethod", id);
    return "deactivated" as const;
  }
  await prisma.deliveryMethod.delete({ where: { id } });
  await audit(u, "delivery.delete", "DeliveryMethod", id);
  return "deleted" as const;
}

// ───────────────────────────── Sizes & colours ─────────────────────────────

export async function saveSize(input: z.infer<typeof sizeInputSchema>, u: Actor, id?: string) {
  const { nameKm, ...rest } = input;
  const data = { ...rest, translations: nameKm ? { km: { name: nameKm } } : {} };
  const s = id ? await prisma.size.update({ where: { id }, data }) : await prisma.size.create({ data });
  await audit(u, id ? "size.update" : "size.create", "Size", s.id, { name: s.name });
  return s;
}
export async function saveColor(input: z.infer<typeof colorInputSchema>, u: Actor, id?: string) {
  const { nameKm, ...rest } = input;
  const data = { ...rest, hex: rest.hex.toUpperCase(), translations: nameKm ? { km: { name: nameKm } } : {} };
  const c = id ? await prisma.color.update({ where: { id }, data }) : await prisma.color.create({ data });
  await audit(u, id ? "color.update" : "color.create", "Color", c.id, { name: c.name });
  return c;
}
export async function deleteOption(kind: "size" | "color", id: string, u: Actor) {
  const used = kind === "size" ? await prisma.productVariant.count({ where: { sizeId: id } }) : await prisma.productVariant.count({ where: { colorId: id } });
  if (used > 0) throw conflict(`This ${kind} is used by ${used} product variant(s) and cannot be deleted.`, "IN_USE");
  if (kind === "size") await prisma.size.delete({ where: { id } });
  else await prisma.color.delete({ where: { id } });
  await audit(u, `${kind}.delete`, kind === "size" ? "Size" : "Color", id);
}

// ───────────────────────────── Settings ─────────────────────────────

export async function saveSettings(input: z.infer<typeof settingsInputSchema>, u: Actor) {
  const data = { ...input, socialLinks: input.socialLinks as never, translations: input.translations as never, homepageSections: input.homepageSections as never, socialGallery: input.socialGallery as never };
  const s = await prisma.storeSettings.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
  await audit(u, "settings.update", "StoreSettings", "default", {
    telegramUsername: s.telegramUsername,
    whatsappNumber: s.whatsappNumber,
    messengerUrl: s.messengerUrl,
    deductStockOn: s.deductStockOn,
    reservationHours: s.reservationHours,
  });
  return s;
}

import "server-only";
import { prisma } from "@/lib/prisma";
import { conflict, notFound } from "@/lib/api";
import { deleteStoredImage } from "@/lib/storage";
import type { ProductInput, ProductQuickEditInput } from "@/lib/validations/admin";
import { logAdminActivity } from "./audit";
import { setStockLevel } from "./inventory";

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "product";
  let slug = root;
  for (let i = 2; i < 500; i++) {
    const clash = await prisma.product.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } });
    if (!clash) return slug;
    slug = `${root}-${i}`;
  }
  throw conflict("Could not generate a unique slug");
}

/** Create or update a product with images, variants, translations and collections in one transaction. */
export async function saveProduct(input: ProductInput, userId: string, productId?: string) {
  const existing = productId
    ? await prisma.product.findUnique({ where: { id: productId }, include: { images: true, variants: { include: { _count: { select: { orderItems: true } } } } } })
    : null;
  if (productId && !existing) throw notFound("Product not found");

  const slug = input.slug ? input.slug : await uniqueSlug(input.name, productId);
  const featured = Math.min(input.featuredImageIndex, Math.max(0, input.images.length - 1));
  const removedImages = existing ? existing.images.filter((img) => !input.images.some((i) => i.id === img.id)) : [];

  const id = await prisma.$transaction(
    async (tx) => {
      const data = {
        name: input.name,
        slug,
        sku: input.sku.toUpperCase(),
        shortDescription: input.shortDescription,
        description: input.description,
        categoryId: input.categoryId,
        brand: input.brand,
        price: input.price,
        salePrice: input.salePrice,
        sortPrice: input.salePrice ?? input.price,
        status: input.status,
        isFeatured: input.isFeatured,
        isNewArrival: input.isNewArrival,
        isBestSeller: input.isBestSeller,
        tags: [...new Set(input.tags)],
        lowStockThreshold: input.lowStockThreshold,
        condition: input.condition,
        publishedAt: input.status === "ACTIVE" ? (existing?.publishedAt ?? new Date()) : existing?.publishedAt ?? null,
      };
      const product = existing ? await tx.product.update({ where: { id: existing.id }, data }) : await tx.product.create({ data });

      // Translations (Khmer).
      const km = input.translations.km;
      if (km && (km.name || km.shortDescription || km.description)) {
        await tx.productTranslation.upsert({
          where: { productId_locale: { productId: product.id, locale: "km" } },
          update: { name: km.name ?? input.name, shortDescription: km.shortDescription, description: km.description },
          create: { productId: product.id, locale: "km", name: km.name ?? input.name, shortDescription: km.shortDescription, description: km.description },
        });
      } else {
        await tx.productTranslation.deleteMany({ where: { productId: product.id, locale: "km" } });
      }

      // Images: delete removed, upsert the rest in order.
      if (removedImages.length) await tx.productImage.deleteMany({ where: { id: { in: removedImages.map((i) => i.id) } } });
      for (const [i, img] of input.images.entries()) {
        const fields = { url: img.url, storageKey: img.storageKey ?? null, alt: img.alt, colorId: img.colorId ?? null, sortOrder: i, isFeatured: i === featured };
        if (img.id && existing?.images.some((e) => e.id === img.id)) await tx.productImage.update({ where: { id: img.id }, data: fields });
        else await tx.productImage.create({ data: { ...fields, productId: product.id } });
      }

      // Variants: update / create / remove (deactivate if referenced by orders or reserved).
      const keepIds = new Set(input.variants.map((v) => v.id).filter(Boolean) as string[]);
      for (const old of existing?.variants ?? []) {
        if (keepIds.has(old.id)) continue;
        if (old._count.orderItems > 0 || old.reserved > 0) await tx.productVariant.update({ where: { id: old.id }, data: { isActive: false } });
        else await tx.productVariant.delete({ where: { id: old.id } });
      }
      for (const v of input.variants) {
        const fields = { sizeId: v.sizeId, colorId: v.colorId, sku: v.sku.toUpperCase(), priceOverride: v.priceOverride, isActive: v.isActive };
        if (v.id && existing?.variants.some((e) => e.id === v.id)) {
          await tx.productVariant.update({ where: { id: v.id }, data: fields });
          await setStockLevel(tx, v.id, v.stock, userId);
        } else {
          const created = await tx.productVariant.create({ data: { ...fields, productId: product.id, stock: 0 } });
          if (v.stock > 0) await setStockLevel(tx, created.id, v.stock, userId, "Initial stock", "INITIAL");
        }
      }

      // Collections.
      await tx.collectionProduct.deleteMany({ where: { productId: product.id, collectionId: { notIn: input.collectionIds } } });
      for (const collectionId of input.collectionIds) {
        await tx.collectionProduct.upsert({
          where: { collectionId_productId: { collectionId, productId: product.id } },
          update: {},
          create: { collectionId, productId: product.id, sortOrder: 999 },
        });
      }

      await logAdminActivity(
        { userId, action: existing ? "product.update" : "product.create", entityType: "Product", entityId: product.id, metadata: { name: product.name, sku: product.sku } },
        tx,
      );
      return product.id;
    },
    { timeout: 30_000 },
  );

  // Storage cleanup only after the database commit succeeded.
  for (const img of removedImages) await deleteStoredImage(img.storageKey);
  return id;
}

/** Delete a product. Products that appear in orders are archived instead (order history must stay intact). */
export async function deleteProduct(productId: string, userId: string): Promise<"deleted" | "archived"> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: true, _count: { select: { orderItems: true } }, variants: { select: { reserved: true } } },
  });
  if (!product) throw notFound("Product not found");
  if (product._count.orderItems > 0 || product.variants.some((v) => v.reserved > 0)) {
    await prisma.product.update({ where: { id: productId }, data: { status: "ARCHIVED" } });
    await logAdminActivity({ userId, action: "product.archive", entityType: "Product", entityId: productId, metadata: { name: product.name, reason: "Has orders" } });
    return "archived";
  }
  await prisma.product.delete({ where: { id: productId } });
  await logAdminActivity({ userId, action: "product.delete", entityType: "Product", entityId: productId, metadata: { name: product.name, sku: product.sku } });
  for (const img of product.images) await deleteStoredImage(img.storageKey);
  return "deleted";
}

/**
 * Quick edit from the product list: name, price, status, flags and per-variant stock/visibility,
 * in one transaction. Stock changes go through setStockLevel (cannot drop below reserved units,
 * logged as inventory movements). Variants must belong to this product.
 */
export async function quickUpdateProduct(productId: string, input: ProductQuickEditInput, userId: string) {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, sku: true, status: true, price: true, salePrice: true, publishedAt: true, variants: { select: { id: true } } },
  });
  if (!existing) throw notFound("Product not found");
  const own = new Set(existing.variants.map((v) => v.id));
  const foreign = input.variants.find((v) => !own.has(v.id));
  if (foreign) throw notFound("Variant not found");

  await prisma.$transaction(
    async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          name: input.name,
          price: input.price,
          salePrice: input.salePrice,
          sortPrice: input.salePrice ?? input.price,
          status: input.status,
          isFeatured: input.isFeatured,
          isNewArrival: input.isNewArrival,
          isBestSeller: input.isBestSeller,
          publishedAt: input.status === "ACTIVE" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
        },
      });
      if (input.nameKm) {
        await tx.productTranslation.upsert({
          where: { productId_locale: { productId, locale: "km" } },
          update: { name: input.nameKm },
          create: { productId, locale: "km", name: input.nameKm },
        });
      }
      for (const v of input.variants) {
        await tx.productVariant.update({ where: { id: v.id }, data: { isActive: v.isActive } });
        await setStockLevel(tx, v.id, v.stock, userId, "Stock updated in quick edit");
      }
      await logAdminActivity(
        {
          userId,
          action: "product.quick_update",
          entityType: "Product",
          entityId: productId,
          metadata: {
            name: input.name,
            sku: existing.sku,
            ...(existing.status !== input.status ? { status: `${existing.status} → ${input.status}` } : {}),
            ...(existing.price.toFixed(2) !== Number(input.price).toFixed(2) ? { price: `${existing.price.toFixed(2)} → ${Number(input.price).toFixed(2)}` } : {}),
          },
        },
        tx,
      );
    },
    { timeout: 20_000 },
  );
}

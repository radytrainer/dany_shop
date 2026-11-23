import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { toCents } from "@/lib/money";
import type { OrderStatus } from "@/generated/prisma/enums";

export const ADMIN_PAGE_SIZE = 25;

// ───────────────────────────── Orders ─────────────────────────────

export type AdminOrderQuery = { q?: string; status?: OrderStatus; from?: string; to?: string; customer?: string; page: number };

export function adminOrderWhere(q: AdminOrderQuery): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if (q.q) {
    and.push({
      OR: [
        { orderNumber: { contains: q.q, mode: "insensitive" } },
        { customerName: { contains: q.q, mode: "insensitive" } },
        { phone: { contains: q.q } },
        { email: { contains: q.q, mode: "insensitive" } },
        { telegramUsername: { contains: q.q.replace(/^@/, ""), mode: "insensitive" } },
      ],
    });
  }
  if (q.status) and.push({ status: q.status });
  if (q.customer) and.push({ userId: q.customer });
  if (q.from) and.push({ createdAt: { gte: new Date(`${q.from}T00:00:00`) } });
  if (q.to) and.push({ createdAt: { lte: new Date(`${q.to}T23:59:59.999`) } });
  return and.length ? { AND: and } : {};
}

export async function listAdminOrders(q: AdminOrderQuery) {
  const where = adminOrderWhere(q);
  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: { _count: { select: { items: true } } },
    }),
  ]);
  return {
    total,
    page: q.page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    items: rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      phone: o.phone,
      status: o.status,
      paymentStatus: o.paymentStatus,
      contactChannel: o.contactChannel,
      messageOpenedAt: o.messageOpenedAt,
      itemCount: o._count.items,
      grandTotalCents: toCents(o.grandTotal),
      currency: o.currency,
      createdAt: o.createdAt,
      stockState: o.stockState,
    })),
  };
}

// ───────────────────────────── Products ─────────────────────────────

export async function listAdminProducts(q: { q?: string; status?: string; category?: string; page: number }) {
  const where: Prisma.ProductWhereInput = {
    ...(q.status && ["DRAFT", "ACTIVE", "ARCHIVED"].includes(q.status) ? { status: q.status as "DRAFT" } : {}),
    ...(q.category ? { categoryId: q.category } : {}),
    ...(q.q
      ? {
          OR: [
            { name: { contains: q.q, mode: "insensitive" } },
            { sku: { contains: q.q, mode: "insensitive" } },
            { variants: { some: { sku: { contains: q.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (q.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: {
        category: { select: { name: true, parent: { select: { name: true } } } },
        images: { orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }], take: 1 },
        variants: { select: { stock: true, reserved: true, isActive: true } },
      },
    }),
  ]);
  return {
    total,
    page: q.page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    items: rows.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      slug: p.slug,
      status: p.status,
      imageUrl: p.images[0]?.url ?? null,
      category: p.category.parent ? `${p.category.parent.name} / ${p.category.name}` : p.category.name,
      priceCents: toCents(p.price),
      salePriceCents: p.salePrice ? toCents(p.salePrice) : null,
      stock: p.variants.filter((v) => v.isActive).reduce((n, v) => n + v.stock, 0),
      available: p.variants.filter((v) => v.isActive).reduce((n, v) => n + Math.max(0, v.stock - v.reserved), 0),
      variantCount: p.variants.length,
      flags: { featured: p.isFeatured, newArrival: p.isNewArrival, bestSeller: p.isBestSeller },
      condition: p.condition,
      updatedAt: p.updatedAt,
    })),
  };
}

// ───────────────────────────── Customers ─────────────────────────────

export async function listAdminCustomers(q: { q?: string; page: number }) {
  const search = q.q ? `%${q.q}%` : null;
  const offset = (q.page - 1) * ADMIN_PAGE_SIZE;
  const where = search
    ? Prisma.sql`WHERE u."role" = 'CUSTOMER' AND (u."name" ILIKE ${search} OR u."email" ILIKE ${search} OR COALESCE(u."phone", '') ILIKE ${search})`
    : Prisma.sql`WHERE u."role" = 'CUSTOMER'`;
  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<{ id: string; name: string; email: string; phone: string | null; createdAt: Date; orders: bigint; total: string | null; lastOrder: Date | null }[]>`
      SELECT u."id", u."name", u."email", u."phone", u."createdAt",
             COUNT(o."id") FILTER (WHERE o."status" <> 'CANCELLED') AS orders,
             SUM(o."grandTotal") FILTER (WHERE o."status" <> 'CANCELLED')::text AS total,
             MAX(o."createdAt") AS "lastOrder"
      FROM "User" u LEFT JOIN "Order" o ON o."userId" = u."id"
      ${where}
      GROUP BY u."id"
      ORDER BY MAX(o."createdAt") DESC NULLS LAST, u."createdAt" DESC
      LIMIT ${ADMIN_PAGE_SIZE} OFFSET ${offset}`,
    prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM "User" u ${where}`,
  ]);
  const total = Number(countRows[0]?.count ?? 0);
  return {
    total,
    page: q.page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      createdAt: r.createdAt,
      orders: Number(r.orders),
      totalCents: toCents(r.total ?? "0"),
      lastOrder: r.lastOrder,
    })),
  };
}

// ───────────────────────────── Inventory ─────────────────────────────

export async function listAdminInventory(q: { q?: string; filter?: string; page: number }, lowThreshold: number) {
  const search = q.q ? `%${q.q}%` : null;
  const conds = [Prisma.sql`p."status" <> 'ARCHIVED'`];
  if (search) conds.push(Prisma.sql`(p."name" ILIKE ${search} OR v."sku" ILIKE ${search})`);
  if (q.filter === "low") conds.push(Prisma.sql`v."stock" - v."reserved" > 0 AND v."stock" - v."reserved" <= ${lowThreshold}`);
  if (q.filter === "out") conds.push(Prisma.sql`v."stock" - v."reserved" <= 0`);
  if (q.filter === "reserved") conds.push(Prisma.sql`v."reserved" > 0`);
  const where = Prisma.sql`WHERE ${Prisma.join(conds, " AND ")}`;
  const offset = (q.page - 1) * ADMIN_PAGE_SIZE;
  const [rows, countRows, totals] = await Promise.all([
    prisma.$queryRaw<{ id: string; sku: string; stock: number; reserved: number; isActive: boolean; productId: string; productName: string; size: string; color: string; hex: string }[]>`
      SELECT v."id", v."sku", v."stock", v."reserved", v."isActive", p."id" AS "productId", p."name" AS "productName",
             s."name" AS size, c."name" AS color, c."hex" AS hex
      FROM "ProductVariant" v JOIN "Product" p ON p."id" = v."productId"
      JOIN "Size" s ON s."id" = v."sizeId" JOIN "Color" c ON c."id" = v."colorId"
      ${where}
      ORDER BY v."stock" - v."reserved" ASC, p."name" ASC, s."sortOrder" ASC
      LIMIT ${ADMIN_PAGE_SIZE} OFFSET ${offset}`,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM "ProductVariant" v JOIN "Product" p ON p."id" = v."productId" ${where}`,
    prisma.$queryRaw<{ onHand: bigint | null; reserved: bigint | null; low: bigint; out: bigint }[]>`
      SELECT SUM(v."stock") AS "onHand", SUM(v."reserved") AS reserved,
             COUNT(*) FILTER (WHERE v."stock" - v."reserved" > 0 AND v."stock" - v."reserved" <= ${lowThreshold}) AS low,
             COUNT(*) FILTER (WHERE v."stock" - v."reserved" <= 0) AS out
      FROM "ProductVariant" v JOIN "Product" p ON p."id" = v."productId"
      WHERE p."status" <> 'ARCHIVED' AND v."isActive"`,
  ]);
  const total = Number(countRows[0]?.count ?? 0);
  return {
    total,
    page: q.page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    summary: {
      onHand: Number(totals[0]?.onHand ?? 0),
      reserved: Number(totals[0]?.reserved ?? 0),
      low: Number(totals[0]?.low ?? 0),
      out: Number(totals[0]?.out ?? 0),
    },
    items: rows.map((r) => ({ ...r, available: r.stock - r.reserved })),
  };
}

import "server-only";
import { prisma } from "@/lib/prisma";
import { toCents } from "@/lib/money";
import { getStoreSettings } from "./settings";

/** All dashboard figures are computed from database records (no sample data). */
export async function getDashboardStats(days = 30) {
  const settings = await getStoreSettings();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const [paidAgg, orderCount, byStatus, customers, products, lowStock, recentOrders, bestSellers, dailyRows] = await Promise.all([
    prisma.order.aggregate({ where: { paymentStatus: "PAID", status: { not: "CANCELLED" } }, _sum: { grandTotal: true } }),
    prisma.order.count(),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.product.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.$queryRaw<{ id: string; sku: string; stock: number; reserved: number; productName: string; productId: string; size: string; color: string }[]>`
      SELECT v."id", v."sku", v."stock", v."reserved", p."name" AS "productName", p."id" AS "productId", s."name" AS "size", c."name" AS "color"
      FROM "ProductVariant" v
      JOIN "Product" p ON p."id" = v."productId"
      JOIN "Size" s ON s."id" = v."sizeId"
      JOIN "Color" c ON c."id" = v."colorId"
      WHERE v."isActive" AND p."status" = 'ACTIVE' AND v."stock" - v."reserved" <= ${settings.lowStockThreshold}
      ORDER BY v."stock" - v."reserved" ASC, p."name" ASC
      LIMIT 10`,
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.orderItem.groupBy({
      by: ["productId", "productName"],
      where: { order: { status: { not: "CANCELLED" } }, productId: { not: null } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.$queryRaw<{ day: Date; orders: bigint; total: string | null; paid: string | null }[]>`
      SELECT date_trunc('day', "createdAt") AS day,
             COUNT(*) AS orders,
             SUM("grandTotal")::text AS total,
             SUM(CASE WHEN "paymentStatus" = 'PAID' THEN "grandTotal" ELSE 0 END)::text AS paid
      FROM "Order"
      WHERE "createdAt" >= ${since} AND "status" <> 'CANCELLED'
      GROUP BY 1 ORDER BY 1`,
  ]);

  const statusCount = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const dayMap = new Map(dailyRows.map((r) => [r.day.toISOString().slice(0, 10), r]));
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
    const row = dayMap.get(key);
    return { date: key, orders: Number(row?.orders ?? 0), totalCents: toCents(row?.total ?? "0"), paidCents: toCents(row?.paid ?? "0") };
  });

  return {
    currency: settings.currency,
    totalSalesCents: toCents(paidAgg._sum.grandTotal ?? "0"),
    totalOrders: orderCount,
    pendingOrders: statusCount("PENDING") + statusCount("AWAITING_SELLER_CONFIRMATION"),
    confirmedOrders: statusCount("CONFIRMED") + statusCount("AWAITING_PAYMENT") + statusCount("PAYMENT_RECEIVED") + statusCount("PREPARING") + statusCount("SHIPPED"),
    completedOrders: statusCount("COMPLETED"),
    totalCustomers: customers,
    totalProducts: products,
    lowStock: lowStock.map((v) => ({ ...v, available: v.stock - v.reserved })),
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      status: o.status,
      paymentStatus: o.paymentStatus,
      grandTotalCents: toCents(o.grandTotal),
      createdAt: o.createdAt,
    })),
    bestSellers: bestSellers.map((b) => ({ productId: b.productId, name: b.productName, units: b._sum.quantity ?? 0, revenueCents: toCents(b._sum.lineTotal ?? "0") })),
    statusBreakdown: byStatus.map((b) => ({ status: b.status, count: b._count._all })),
    daily,
  };
}
export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;

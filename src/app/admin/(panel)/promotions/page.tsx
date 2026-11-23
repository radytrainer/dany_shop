import { requireAdminPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/services/settings";
import { PageHeader } from "@/components/admin/admin-ui";
import { PromotionsManager } from "@/components/admin/promotions-manager";

export const metadata = { title: "Promotions" };

const iso = (d: Date | null) => (d ? d.toISOString() : "");

export default async function PromotionsPage() {
  await requireAdminPage("promotions.manage");
  const [coupons, promotions, categories, products, settings] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { categories: { select: { id: true } }, products: { select: { id: true } } } }),
    prisma.promotion.findMany({ orderBy: { createdAt: "desc" }, include: { categories: { select: { id: true } }, products: { select: { id: true } } } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { parent: { select: { name: true } } } }),
    prisma.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true, sku: true } }),
    getStoreSettings(),
  ]);
  return (
    <div>
      <PageHeader title="Promotions" description="Coupon codes are entered at checkout. Automatic promotions reduce product prices directly. Discounts are always recalculated on the server." />
      <PromotionsManager
        currency={settings.currency}
        categories={categories.map((c) => ({ id: c.id, name: c.parent ? `${c.parent.name} / ${c.name}` : c.name }))}
        products={products.map((p) => ({ id: p.id, name: `${p.name} (${p.sku})` }))}
        coupons={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          description: c.description ?? "",
          type: c.type,
          value: c.value.toFixed(2),
          scope: c.scope,
          categoryIds: c.categories.map((x) => x.id),
          productIds: c.products.map((x) => x.id),
          minOrderAmount: c.minOrderAmount?.toFixed(2) ?? "",
          maxDiscount: c.maxDiscount?.toFixed(2) ?? "",
          startsAt: iso(c.startsAt),
          expiresAt: iso(c.expiresAt),
          usageLimit: c.usageLimit?.toString() ?? "",
          usageCount: c.usageCount,
          isActive: c.isActive,
        }))}
        promotions={promotions.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          value: p.value.toFixed(2),
          scope: p.scope,
          categoryIds: p.categories.map((x) => x.id),
          productIds: p.products.map((x) => x.id),
          startsAt: iso(p.startsAt),
          endsAt: iso(p.endsAt),
          isActive: p.isActive,
        }))}
      />
    </div>
  );
}

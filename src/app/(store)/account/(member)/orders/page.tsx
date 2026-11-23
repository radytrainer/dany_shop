import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { requireCustomerPage } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
import { prisma } from "@/lib/prisma";
import { formatMoney, toCents } from "@/lib/money";
import { EmptyState } from "@/components/shared/empty-state";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

export default async function AccountOrdersPage() {
  const user = await requireCustomerPage("/account/orders");
  const { locale, t } = await getI18n();
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { items: { take: 3, select: { imageUrl: true, productName: true } }, _count: { select: { items: true } } },
  });
  const dateFmt = new Intl.DateTimeFormat(locale === "km" ? "km-KH" : "en-GB", { dateStyle: "medium" });

  if (orders.length === 0) {
    return <EmptyState icon={Package} title={t("account.orders")} body={t("account.noOrders")} action={{ label: t("cart.continueShopping"), href: "/shop" }} className="py-10" />;
  }

  return (
    <div>
      <h2 className="mb-4 text-xs font-semibold tracking-[0.16em] uppercase">{t("account.orders")}</h2>
      <ul className="divide-y border-y">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/orders/${o.orderNumber}`} className="flex flex-col gap-3 py-5 hover:bg-secondary/60 sm:flex-row sm:items-center sm:gap-6 sm:px-3">
              <div className="flex-1">
                <p className="font-medium">{o.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {dateFmt.format(o.createdAt)} · {t(o._count.items === 1 ? "common.item" : "common.items", { count: o._count.items })}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{o.items.map((i) => i.productName).join(", ")}</p>
              </div>
              <OrderStatusBadge status={o.status} label={t(`orderStatus.${o.status}`)} />
              <p className="w-24 text-sm font-medium tabular-nums sm:text-right">{formatMoney(toCents(o.grandTotal), o.currency, locale)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, Clock } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/permissions";
import { formatMoney, toCents } from "@/lib/money";
import { buildSellerMessaging, getAccessibleOrder } from "@/services/orders";
import { OrderMessaging } from "@/components/checkout/order-messaging";
import { ReceiptActions } from "@/components/checkout/receipt-actions";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";

export const metadata: Metadata = { title: "Order", robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[orderNumber]">) {
  const { orderNumber } = await params;
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : null;
  const isNew = sp.new === "1";
  const { locale, t } = await getI18n();
  const user = await getCurrentUser();

  const order = /^ORD-\d{4}-\d{5,}$/.test(orderNumber)
    ? await getAccessibleOrder(orderNumber, { token, userId: user?.id, isStaff: isStaffRole(user?.role) })
    : null;

  if (!order) notFound();

  const money = (v: { toFixed(n: number): string }) => formatMoney(toCents(v), order.currency, locale);
  const orderUrl = token ? `${process.env.APP_URL ?? ""}/orders/${order.orderNumber}?token=${encodeURIComponent(token)}` : null;
  const { message, links } = await buildSellerMessaging(order, orderUrl);
  const awaiting = ["PENDING", "AWAITING_SELLER_CONFIRMATION"].includes(order.status);
  const dateFmt = new Intl.DateTimeFormat(locale === "km" ? "km-KH" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="container-page max-w-5xl py-10 sm:py-14">
      <div className="text-center">
        {isNew ? (
          <CircleCheck className="mx-auto size-12 text-success" strokeWidth={1.3} aria-hidden />
        ) : (
          <Clock className="mx-auto size-10 text-muted-foreground" strokeWidth={1.3} aria-hidden />
        )}
        <h1 className="mt-4 font-heading text-4xl sm:text-5xl">{isNew ? t("order.confirmationTitle") : t("order.viewOrder")}</h1>
        {isNew && <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">{t("order.confirmationBody", { name: order.customerName })}</p>}
        <p className="mt-6 text-xs tracking-[0.2em] text-muted-foreground uppercase">{t("order.orderNumber")}</p>
        <p className="mt-1 font-heading text-3xl tracking-wide" data-testid="order-number">
          {order.orderNumber}
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <OrderStatusBadge status={order.status} label={t(`orderStatus.${order.status}`)} />
          <span className="border px-2.5 py-1 text-xs">{t(`paymentStatus.${order.paymentStatus}`)}</span>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {awaiting && (
            <section className="border border-brand/40 bg-brand/5 p-5">
              <p className="text-sm">{t("order.notConfirmedYet")}</p>
              <div className="mt-4">
                <OrderMessaging orderNumber={order.orderNumber} token={token} message={message} links={links} preferred={order.contactChannel} />
              </div>
              {token && <p className="mt-4 text-xs text-muted-foreground">{t("order.keepLink")}</p>}
            </section>
          )}

          <section>
            <h2 className="mb-4 text-xs font-semibold tracking-[0.16em] uppercase">{t("order.items")}</h2>
            <ul className="divide-y border-y">
              {order.items.map((i) => (
                <li key={i.id} className="flex gap-4 py-4">
                  <div className="relative h-24 w-18 shrink-0 bg-secondary">
                    {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="72px" className="object-cover" />}
                  </div>
                  <div className="flex-1 text-sm">
                    <Link href={`/products/${i.productSlug}`} className="hover:underline">
                      {i.productName}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("product.color")}: {i.colorName} · {t("product.size")}: {i.sizeName} · {t("product.quantity")}: {i.quantity}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("cart.unitPrice")}: {money(i.unitPrice)}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums">{money(i.lineTotal)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xs font-semibold tracking-[0.16em] uppercase">{t("order.statusHistory")}</h2>
            <ol className="space-y-3 border-l pl-5">
              {order.statusHistory.map((h) => (
                <li key={h.id} className="relative text-sm">
                  <span className="absolute top-1.5 -left-[25px] size-2 rounded-full bg-foreground" />
                  <span className="font-medium">{t(`orderStatus.${h.toStatus}`)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{dateFmt.format(h.createdAt)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="h-fit space-y-6 bg-secondary p-6">
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt>{t("cart.subtotal")}</dt>
              <dd>{money(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>
                {t("cart.discount")}
                {order.couponCode && <span className="ml-1 text-xs">({order.couponCode})</span>}
              </dt>
              <dd>−{money(order.discountTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("cart.delivery")}</dt>
              <dd>{money(order.deliveryFee)}</dd>
            </div>
            {toCents(order.taxTotal) > 0 && (
              <div className="flex justify-between">
                <dt>{t("cart.tax")}</dt>
                <dd>{money(order.taxTotal)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t pt-3 text-base font-semibold">
              <dt>{t("cart.grandTotal")}</dt>
              <dd data-testid="order-total">{money(order.grandTotal)}</dd>
            </div>
          </dl>
          <div className="space-y-1 text-sm">
            <p className="text-xs font-semibold tracking-wider uppercase">{t("order.deliveryTo")}</p>
            <p>{order.customerName}</p>
            <p className="text-muted-foreground">{order.phone}</p>
            <p className="text-muted-foreground">{[order.addressLine, order.commune, order.district, order.province].join(", ")}</p>
            <p className="text-muted-foreground">{order.deliveryMethodName}</p>
            {order.trackingNumber && (
              <p className="pt-2">
                {t("order.tracking")}: <span className="font-medium">{order.trackingNumber}</span>
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("order.placedOn")} {dateFmt.format(order.createdAt)}
          </p>
          <ReceiptActions
            orderNumber={order.orderNumber}
            token={token}
            locale={locale}
            labels={{ download: t("receipt.download"), print: t("receipt.print"), hint: t("receipt.hint") }}
          />
        </aside>
      </div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Mail, MessageCircle, Phone, Printer, Send } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatMoney, toCents } from "@/lib/money";
import { normalizeTelegramUsername, normalizeWhatsappNumber } from "@/lib/messaging/order-message";
import { ORDER_TRANSITIONS } from "@/services/admin-orders";
import { buildSellerMessaging } from "@/services/orders";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { CopyMessageButton, OrderNotesForm, OrderStatusForm } from "@/components/admin/order-actions";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { Button } from "@/components/ui/button";

const label = (s: string) => s.charAt(0) + s.slice(1).replace(/_/g, " ").toLowerCase();

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const user = await requireAdminPage("orders.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      statusHistory: { orderBy: { createdAt: "asc" }, include: { changedBy: { select: { name: true } } } },
      user: { select: { id: true, name: true, email: true } },
      movements: { orderBy: { createdAt: "asc" }, include: { variant: { select: { sku: true } } } },
    },
  });
  if (!order) notFound();
  const money = (v: { toFixed(n: number): string }) => formatMoney(toCents(v), order.currency);
  const { message } = await buildSellerMessaging(order);
  const dt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
  const canManage = can(user.role, "orders.manage");
  const tg = normalizeTelegramUsername(order.telegramUsername);
  const wa = normalizeWhatsappNumber(order.phone.startsWith("0") ? `855${order.phone.replace(/\D/g, "").slice(1)}` : order.phone);

  return (
    <div>
      <Link href="/admin/orders" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Orders
      </Link>
      <PageHeader
        title={order.orderNumber}
        description={`Placed ${dt.format(order.createdAt)} · contact via ${label(order.contactChannel)} · ${order.messageOpenedAt ? `messaging app opened ${dt.format(order.messageOpenedAt)}` : "customer has not opened the messaging app"}`}
        actions={
          <>
            <CopyMessageButton message={message} />
            <Button asChild variant="outline" className="h-9 rounded-sm text-xs">
              <Link href={`/admin/orders/${order.id}/invoice`} target="_blank">
                <Printer className="size-4" /> Print invoice
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-sm text-xs">
              <a href={`/api/orders/${order.orderNumber}/receipt?download=1&lang=${order.locale === "km" ? "km" : "en"}`}>
                <Download className="size-4" /> Receipt PDF
              </a>
            </Button>
          </>
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <OrderStatusBadge status={order.status} label={label(order.status)} />
        <span className={`border px-2.5 py-1 text-xs ${order.paymentStatus === "PAID" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : ""}`}>
          {order.paymentStatus === "PAID" ? `Paid${order.paidAt ? ` · ${dt.format(order.paidAt)}` : ""}` : "Unpaid"}
        </span>
        <span className="border px-2.5 py-1 text-xs">Stock: {label(order.stockState)}</span>
        {order.stockState === "RESERVED" && order.reservationExpiresAt && (
          <span className="border px-2.5 py-1 text-xs text-muted-foreground">Reserved until {dt.format(order.reservationExpiresAt)}</span>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Variant</th>
                  <th className="px-4 py-3 text-right font-medium">Unit</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id} className="border-b">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-11 shrink-0 bg-secondary">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="44px" className="object-cover" />}</div>
                        <div>
                          {i.productId ? (
                            <Link href={`/admin/products/${i.productId}`} className="hover:underline">
                              {i.productName}
                            </Link>
                          ) : (
                            i.productName
                          )}
                          <p className="text-xs text-muted-foreground">{i.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {i.colorName} / {i.sizeName}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(i.unitPrice)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{i.quantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="ml-auto max-w-xs space-y-1.5 p-4 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{money(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Discount {order.couponCode && <span className="text-xs text-muted-foreground">({order.couponCode})</span>}</dt>
                <dd className="tabular-nums">−{money(order.discountTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Delivery · {order.deliveryMethodName}</dt>
                <dd className="tabular-nums">{money(order.deliveryFee)}</dd>
              </div>
              {toCents(order.taxTotal) > 0 && (
                <div className="flex justify-between">
                  <dt>Tax</dt>
                  <dd className="tabular-nums">{money(order.taxTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <dt>Grand total</dt>
                <dd className="tabular-nums">{money(order.grandTotal)}</dd>
              </div>
            </dl>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-sm font-semibold">Customer</h2>
              <p className="text-sm">{order.customerName}</p>
              {order.user && (
                <Link href={`/admin/customers/${order.user.id}`} className="text-xs underline underline-offset-4">
                  Registered customer · view history
                </Link>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <a href={`tel:${order.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 rounded-sm border px-2 py-1 hover:border-foreground">
                  <Phone className="size-3.5" /> {order.phone}
                </a>
                {tg && (
                  <a href={`https://t.me/${tg}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-sm border px-2 py-1 hover:border-foreground">
                    <Send className="size-3.5" /> @{tg}
                  </a>
                )}
                {wa && (
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-sm border px-2 py-1 hover:border-foreground">
                    <MessageCircle className="size-3.5" /> WhatsApp
                  </a>
                )}
                {order.email && (
                  <a href={`mailto:${order.email}`} className="inline-flex items-center gap-1 rounded-sm border px-2 py-1 hover:border-foreground">
                    <Mail className="size-3.5" /> {order.email}
                  </a>
                )}
              </div>
            </Card>
            <Card>
              <h2 className="mb-3 text-sm font-semibold">Delivery</h2>
              <p className="text-sm">{order.addressLine}</p>
              <p className="text-sm text-muted-foreground">{[order.commune, order.district, order.province].join(", ")}</p>
              <p className="mt-2 text-sm">{order.deliveryMethodName}</p>
              {order.deliveryNotes && <p className="mt-2 text-xs text-muted-foreground">Note: {order.deliveryNotes}</p>}
              {order.trackingNumber && <p className="mt-2 text-xs">Tracking: {order.trackingNumber}</p>}
            </Card>
          </div>

          <Card>
            <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
            <ol className="space-y-3 border-l pl-5 text-sm">
              {order.statusHistory.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute top-1.5 -left-[25px] size-2 rounded-full bg-foreground" />
                  <span className="font-medium">{h.fromStatus && h.fromStatus !== h.toStatus ? `${label(h.fromStatus)} → ${label(h.toStatus)}` : label(h.toStatus)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {dt.format(h.createdAt)} {h.changedBy ? `· ${h.changedBy.name}` : "· system/customer"}
                  </span>
                  {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold">Stock movements for this order</h2>
            {order.movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              <table className="w-full text-xs">
                <tbody>
                  {order.movements.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="py-1.5">{dt.format(m.createdAt)}</td>
                      <td className="py-1.5 font-medium">{m.type}</td>
                      <td className="py-1.5">{m.variant.sku}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        stock {m.stockDelta >= 0 ? "+" : ""}
                        {m.stockDelta} · reserved {m.reservedDelta >= 0 ? "+" : ""}
                        {m.reservedDelta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Update order</h2>
            <OrderStatusForm orderId={order.id} status={order.status} allowed={ORDER_TRANSITIONS[order.status]} canManage={canManage} />
            {order.paymentNote && <p className="mt-3 text-xs text-muted-foreground">Payment note: {order.paymentNote}</p>}
          </Card>
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Notes & tracking</h2>
            <OrderNotesForm orderId={order.id} internalNotes={order.internalNotes} trackingNumber={order.trackingNumber} canManage={canManage} />
          </Card>
        </div>
      </div>
    </div>
  );
}

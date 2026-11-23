import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney, toCents } from "@/lib/money";
import { getStoreSettings } from "@/services/settings";
import { PrintButton } from "@/components/admin/print-button";
import { BrandLogo } from "@/components/shared/brand-logo";

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: PageProps<"/admin/orders/[id]/invoice">) {
  await requireAdminPage("orders.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [order, settings] = await Promise.all([prisma.order.findUnique({ where: { id }, include: { items: true } }), getStoreSettings()]);
  if (!order) notFound();
  const money = (v: { toFixed(n: number): string }) => formatMoney(toCents(v), order.currency);
  const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(order.createdAt);

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-sm text-black print:p-0">
      <div className="no-print mb-6 flex justify-end">
        <PrintButton />
      </div>
      <div className="flex items-start justify-between border-b pb-6">
        <div>
          <BrandLogo logoUrl={settings.logoUrl} storeName={settings.storeName} className="h-10" textClassName="text-3xl" />
          {settings.address && <p className="mt-2 text-xs">{settings.address}</p>}
          {settings.contactPhone && <p className="text-xs">{settings.contactPhone}</p>}
          {settings.contactEmail && <p className="text-xs">{settings.contactEmail}</p>}
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold">INVOICE</p>
          <p className="mt-1">{order.orderNumber}</p>
          <p className="text-xs">{date}</p>
          <p className="mt-1 text-xs">Payment: {order.paymentStatus === "PAID" ? "Paid" : "Unpaid"}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 py-6">
        <div>
          <p className="text-xs font-semibold uppercase">Bill / ship to</p>
          <p className="mt-1">{order.customerName}</p>
          <p>{order.phone}</p>
          {order.email && <p>{order.email}</p>}
          <p className="mt-1">{order.addressLine}</p>
          {[order.commune, order.district, order.province].some(Boolean) && <p>{[order.commune, order.district, order.province].filter(Boolean).join(", ")}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase">Delivery</p>
          <p className="mt-1">{order.deliveryMethodName}</p>
          {order.trackingNumber && <p>Tracking: {order.trackingNumber}</p>}
          {order.deliveryNotes && <p className="text-xs">Note: {order.deliveryNotes}</p>}
        </div>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-y text-left text-xs uppercase">
            <th className="py-2">Item</th>
            <th className="py-2">SKU</th>
            <th className="py-2 text-right">Unit</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id} className="border-b">
              <td className="py-2">
                {i.productName}
                <span className="block text-xs">
                  {i.colorName} / {i.sizeName}
                </span>
              </td>
              <td className="py-2 text-xs">{i.sku}</td>
              <td className="py-2 text-right tabular-nums">{money(i.unitPrice)}</td>
              <td className="py-2 text-right tabular-nums">{i.quantity}</td>
              <td className="py-2 text-right tabular-nums">{money(i.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto mt-4 max-w-xs space-y-1">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{money(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
          <dd>−{money(order.discountTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Delivery</dt>
          <dd>{money(order.deliveryFee)}</dd>
        </div>
        {toCents(order.taxTotal) > 0 && (
          <div className="flex justify-between">
            <dt>{settings.taxLabel}</dt>
            <dd>{money(order.taxTotal)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t pt-1 text-base font-semibold">
          <dt>Total</dt>
          <dd>{money(order.grandTotal)}</dd>
        </div>
      </dl>
      {settings.footerText && <p className="mt-10 text-center text-xs">{settings.footerText}</p>}
    </div>
  );
}

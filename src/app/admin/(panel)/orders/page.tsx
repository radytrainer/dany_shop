import Link from "next/link";
import { Download, MessageCircle } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { orderListQuerySchema, ORDER_STATUSES } from "@/lib/validations/admin";
import { searchParamsToRecord } from "@/lib/validations/catalog";
import { listAdminOrders } from "@/services/admin-queries";
import { releaseExpiredReservations } from "@/services/inventory";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { inputCls } from "@/components/admin/admin-styles";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Orders" };

const label = (s: string) => s.charAt(0) + s.slice(1).replace(/_/g, " ").toLowerCase();

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdminPage("orders.view");
  const sp = await searchParams;
  const q = orderListQuerySchema.parse(searchParamsToRecord(sp));
  await releaseExpiredReservations();
  const data = await listAdminOrders(q);

  const qs = (overrides: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: q.q, status: q.status, from: q.from, to: q.to, customer: q.customer, ...overrides })) if (v !== undefined && v !== "") p.set(k, String(v));
    return p.toString();
  };
  const dt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Every submitted order is saved here — including customers who did not finish the messaging step."
        actions={
          <Button asChild variant="outline" className="h-10 rounded-sm">
            <a href={`/api/admin/orders/export?${qs({})}`}>
              <Download className="size-4" /> Export CSV
            </a>
          </Button>
        }
      />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <input name="q" defaultValue={q.q} placeholder="Order number, name, phone, email…" className={inputCls} aria-label="Search" />
          <select name="status" defaultValue={q.status ?? ""} className={inputCls} aria-label="Status">
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
          <input type="date" name="from" defaultValue={q.from} className={inputCls} aria-label="From date" />
          <input type="date" name="to" defaultValue={q.to} className={inputCls} aria-label="To date" />
          {q.customer && <input type="hidden" name="customer" value={q.customer} />}
          <div className="flex gap-2">
            <Button type="submit" className="h-10 rounded-sm">
              Filter
            </Button>
            <Button asChild variant="ghost" className="h-10 rounded-sm">
              <Link href="/admin/orders">Reset</Link>
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                    No orders match these filters.
                  </td>
                </tr>
              ) : (
                data.items.map((o) => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                        {o.orderNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">{dt.format(o.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {o.customerName}
                      <p className="text-xs text-muted-foreground">{o.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={o.status} label={label(o.status)} />
                    </td>
                    <td className="px-4 py-3 text-xs">{o.paymentStatus === "PAID" ? <span className="font-medium text-success">Paid</span> : "Unpaid"}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="size-3.5" /> {label(o.contactChannel)}
                      </span>
                      <p className="text-muted-foreground">{o.messageOpenedAt ? "App opened" : "Not opened yet"}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(o.grandTotalCents, o.currency)}
                      <p className="text-xs text-muted-foreground">{o.itemCount} items</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">{data.total} orders</p>
      <AdminPagination page={data.page} pageCount={data.pageCount} href={(p) => `/admin/orders?${qs({ page: p })}`} />
    </div>
  );
}

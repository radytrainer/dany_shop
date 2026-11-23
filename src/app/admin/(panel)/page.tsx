import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { getDashboardStats } from "@/services/admin-dashboard";
import { releaseExpiredReservations } from "@/services/inventory";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { SalesChart, StatusChart } from "@/components/admin/dashboard-charts";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";

export const metadata = { title: "Dashboard" };

function Stat({ label, value, href, sub }: { label: string; value: string | number; href?: string; sub?: string }) {
  const body = (
    <div className="rounded-sm border bg-background p-4 transition-colors hover:border-foreground/40">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-3xl tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  await requireAdminPage("dashboard.view");
  const denied = (await searchParams).denied === "1";
  await releaseExpiredReservations();
  const s = await getDashboardStats();
  const money = (c: number) => formatMoney(c, s.currency);

  return (
    <div>
      <PageHeader title="Dashboard" description="All figures are calculated live from orders, products and customers in the database." />
      {denied && (
        <p className="mb-4 flex items-center gap-2 rounded-sm border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="size-4" /> Your role doesn&apos;t have access to that page.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total sales (paid)" value={money(s.totalSalesCents)} sub="Payments recorded manually" />
        <Stat label="Total orders" value={s.totalOrders} href="/admin/orders" />
        <Stat label="Pending orders" value={s.pendingOrders} href="/admin/orders?status=PENDING" sub="Incl. awaiting confirmation" />
        <Stat label="Confirmed / in progress" value={s.confirmedOrders} />
        <Stat label="Completed orders" value={s.completedOrders} href="/admin/orders?status=COMPLETED" />
        <Stat label="Customers" value={s.totalCustomers} href="/admin/customers" />
        <Stat label="Products" value={s.totalProducts} href="/admin/products" />
        <Stat label="Low-stock variants" value={s.lowStock.length} href="/admin/inventory?filter=low" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <SalesChart daily={s.daily} currency={s.currency} />
        </Card>
        <Card>
          <StatusChart breakdown={s.statusBreakdown} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs underline underline-offset-4">
              View all
            </Link>
          </div>
          {s.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {s.recentOrders.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="py-2.5">
                      <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                        {o.orderNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">{o.customerName}</p>
                    </td>
                    <td className="py-2.5">
                      <OrderStatusBadge status={o.status} label={o.status.replace(/_/g, " ").toLowerCase()} />
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{money(o.grandTotalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Best-selling products</h2>
            {s.bestSellers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {s.bestSellers.map((b, i) => (
                  <li key={b.productId ?? i} className="flex justify-between gap-3">
                    <span className="truncate">
                      {i + 1}. {b.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">{b.units} sold</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Low stock</h2>
              <Link href="/admin/inventory?filter=low" className="text-xs underline underline-offset-4">
                Inventory
              </Link>
            </div>
            {s.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">All variants are well stocked.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {s.lowStock.map((v) => (
                  <li key={v.id} className="flex justify-between gap-3">
                    <Link href={`/admin/products/${v.productId}`} className="truncate hover:underline">
                      {v.productName} <span className="text-muted-foreground">· {v.color} / {v.size}</span>
                    </Link>
                    <span className={`shrink-0 tabular-nums ${v.available <= 0 ? "text-destructive" : "text-brand"}`}>{v.available <= 0 ? "Out" : `${v.available} left`}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

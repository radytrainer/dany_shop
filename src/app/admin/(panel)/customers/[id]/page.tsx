import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney, toCents } from "@/lib/money";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  await requireAdminPage("customers.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await prisma.user.findFirst({
    where: { id, role: "CUSTOMER" },
    include: { customerProfile: true, addresses: true, orders: { orderBy: { createdAt: "desc" } } },
  });
  if (!c) notFound();
  const active = c.orders.filter((o) => o.status !== "CANCELLED");
  const total = active.reduce((n, o) => n + toCents(o.grandTotal), 0);
  const currency = c.orders[0]?.currency ?? "USD";
  const d = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
  return (
    <div>
      <Link href="/admin/customers" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Customers
      </Link>
      <PageHeader title={c.name} description={`Customer since ${d.format(c.createdAt)}`} />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd>{c.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd>{c.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Telegram</dt>
              <dd>{c.customerProfile?.telegramUsername ? `@${c.customerProfile.telegramUsername}` : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Orders / lifetime value</dt>
              <dd>
                {active.length} · {formatMoney(total, currency)}
              </dd>
            </div>
          </dl>
          {c.addresses.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-xs text-muted-foreground">Saved addresses</p>
              {c.addresses.map((a) => (
                <p key={a.id} className="mb-2 text-xs">
                  {a.label && <span className="font-medium">{a.label}: </span>}
                  {[a.addressLine, a.commune, a.district, a.province].filter(Boolean).join(", ")}
                </p>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-0">
          <h2 className="px-4 pt-4 text-sm font-semibold">Order history</h2>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {c.orders.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-muted-foreground">No orders yet.</td>
                </tr>
              ) : (
                c.orders.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                        {o.orderNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">{d.format(o.createdAt)}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <OrderStatusBadge status={o.status} label={o.status.replace(/_/g, " ").toLowerCase()} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(toCents(o.grandTotal), o.currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

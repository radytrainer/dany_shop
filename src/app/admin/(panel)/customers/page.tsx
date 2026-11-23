import Link from "next/link";
import { z } from "zod";
import { requireAdminPage } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { searchParamsToRecord } from "@/lib/validations/catalog";
import { listAdminCustomers } from "@/services/admin-queries";
import { getStoreSettings } from "@/services/settings";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { inputCls } from "@/components/admin/admin-styles";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Customers" };
const schema = z.object({ q: z.string().trim().max(100).optional(), page: z.coerce.number().int().min(1).catch(1).default(1) });

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdminPage("customers.view");
  const q = schema.parse(searchParamsToRecord(await searchParams));
  const [data, settings] = await Promise.all([listAdminCustomers(q), getStoreSettings()]);
  const d = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
  return (
    <div>
      <PageHeader title="Customers" description="Registered customer accounts. Guest orders are listed under Orders (search by phone)." />
      <Card className="mb-4">
        <form method="get" className="flex gap-2">
          <input name="q" defaultValue={q.q} placeholder="Name, email or phone" className={inputCls} aria-label="Search customers" />
          <Button type="submit" className="h-10 rounded-sm">
            Search
          </Button>
        </form>
      </Card>
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 text-right font-medium">Orders</th>
                <th className="px-4 py-3 text-right font-medium">Total purchases</th>
                <th className="px-4 py-3 text-right font-medium">Last order</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    No customers found.
                  </td>
                </tr>
              ) : (
                data.items.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/customers/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.orders}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(c.totalCents, settings.currency)}</td>
                    <td className="px-4 py-3 text-right text-xs">{c.lastOrder ? d.format(c.lastOrder) : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <AdminPagination page={data.page} pageCount={data.pageCount} href={(p) => `/admin/customers?${new URLSearchParams({ ...(q.q ? { q: q.q } : {}), page: String(p) })}`} />
    </div>
  );
}

import Link from "next/link";
import { z } from "zod";
import { requireAdminPage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { searchParamsToRecord } from "@/lib/validations/catalog";
import { listAdminInventory } from "@/services/admin-queries";
import { getStoreSettings } from "@/services/settings";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { inputCls } from "@/components/admin/admin-styles";
import { AdjustStockButton } from "@/components/admin/inventory-adjust";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Inventory" };

const schema = z.object({
  q: z.string().trim().max(100).optional(),
  filter: z.enum(["all", "low", "out", "reserved"]).catch("all").default("all"),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

export default async function InventoryPage({ searchParams }: PageProps<"/admin/inventory">) {
  const user = await requireAdminPage("inventory.view");
  const q = schema.parse(searchParamsToRecord(await searchParams));
  const settings = await getStoreSettings();
  const [data, movements] = await Promise.all([
    listAdminInventory(q, settings.lowStockThreshold),
    prisma.inventoryMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: { select: { name: true } }, order: { select: { orderNumber: true, id: true } }, variant: { select: { sku: true, product: { select: { name: true } } } } },
    }),
  ]);
  const manage = can(user.role, "inventory.manage");
  const qs = (o: Record<string, string | number>) => new URLSearchParams(Object.entries({ q: q.q ?? "", filter: q.filter, ...o }).filter(([, v]) => v !== "" && v !== "all").map(([k, v]) => [k, String(v)])).toString();
  const dt = new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short" });

  const tabs = [
    { key: "all", label: "All variants" },
    { key: "low", label: `Low stock (${data.summary.low})` },
    { key: "out", label: `Out of stock (${data.summary.out})` },
    { key: "reserved", label: "Reserved by orders" },
  ];

  return (
    <div>
      <PageHeader title="Inventory" description={`Low-stock threshold: ${settings.lowStockThreshold} units (change in Settings). Available = on hand − reserved.`} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Units on hand", data.summary.onHand],
          ["Reserved by open orders", data.summary.reserved],
          ["Low-stock variants", data.summary.low],
          ["Out-of-stock variants", data.summary.out],
        ].map(([l, v]) => (
          <div key={l} className="rounded-sm border bg-background p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="mt-1 font-heading text-2xl tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin/inventory?${qs({ filter: t.key, page: 1 })}`} className={`rounded-sm border px-3 py-1.5 text-xs ${q.filter === t.key ? "border-foreground bg-foreground text-background" : "hover:border-foreground"}`}>
            {t.label}
          </Link>
        ))}
        <form method="get" className="ml-auto flex gap-2">
          <input type="hidden" name="filter" value={q.filter} />
          <input name="q" defaultValue={q.q} placeholder="Product or SKU" className={inputCls + " w-56"} aria-label="Search inventory" />
          <Button type="submit" className="h-10 rounded-sm">
            Search
          </Button>
        </form>
      </div>
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Product / variant</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 text-right font-medium">On hand</th>
                <th className="px-4 py-3 text-right font-medium">Reserved</th>
                <th className="px-4 py-3 text-right font-medium">Available</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No variants match.
                  </td>
                </tr>
              ) : (
                data.items.map((v) => (
                  <tr key={v.id} className={`border-b last:border-0 ${v.isActive ? "" : "opacity-50"}`}>
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/products/${v.productId}`} className="hover:underline">
                        {v.productName}
                      </Link>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="size-2.5 rounded-full border" style={{ backgroundColor: v.hex }} /> {v.color} / {v.size}
                        {!v.isActive && " · inactive"}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-xs">{v.sku}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{v.stock}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{v.reserved}</td>
                    <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${v.available <= 0 ? "text-destructive" : v.available <= settings.lowStockThreshold ? "text-brand" : ""}`}>{v.available}</td>
                    <td className="px-4 py-2.5 text-right">{manage && <AdjustStockButton variantId={v.id} label={`${v.productName} · ${v.color} / ${v.size}`} stock={v.stock} reserved={v.reserved} />}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <AdminPagination page={data.page} pageCount={data.pageCount} href={(p) => `/admin/inventory?${qs({ page: p })}`} />

      <Card className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Recent stock movements</h2>
        <table className="w-full text-xs">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1.5">When</th>
              <th className="py-1.5">Type</th>
              <th className="py-1.5">Variant</th>
              <th className="py-1.5 text-right">Δ stock</th>
              <th className="py-1.5 text-right">Δ reserved</th>
              <th className="py-1.5">Reason</th>
              <th className="py-1.5">By</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="py-1.5 whitespace-nowrap">{dt.format(m.createdAt)}</td>
                <td className="py-1.5 font-medium">{m.type}</td>
                <td className="py-1.5">
                  {m.variant.product.name} <span className="text-muted-foreground">({m.variant.sku})</span>
                </td>
                <td className="py-1.5 text-right tabular-nums">{m.stockDelta > 0 ? `+${m.stockDelta}` : m.stockDelta}</td>
                <td className="py-1.5 text-right tabular-nums">{m.reservedDelta > 0 ? `+${m.reservedDelta}` : m.reservedDelta}</td>
                <td className="py-1.5">
                  {m.reason}
                  {m.order && (
                    <Link href={`/admin/orders/${m.order.id}`} className="ml-1 underline">
                      {m.order.orderNumber}
                    </Link>
                  )}
                </td>
                <td className="py-1.5">{m.user?.name ?? "System"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

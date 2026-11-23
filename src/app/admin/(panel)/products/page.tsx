import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { z } from "zod";
import { requireAdminPage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { searchParamsToRecord } from "@/lib/validations/catalog";
import { listAdminProducts } from "@/services/admin-queries";
import { getStoreSettings } from "@/services/settings";
import { ProductQuickEdit } from "@/components/admin/product-quick-edit";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { inputCls } from "@/components/admin/admin-styles";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Products" };

const schema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional().catch(undefined),
  category: z.string().uuid().optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const user = await requireAdminPage("products.view");
  const q = schema.parse(searchParamsToRecord(await searchParams));
  const [data, categories, settings] = await Promise.all([
    listAdminProducts(q),
    prisma.category.findMany({ orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }], include: { parent: { select: { name: true } } } }),
    getStoreSettings(),
  ]);
  const canEdit = can(user.role, "products.manage");
  const qs = (page: number) => new URLSearchParams(Object.entries({ ...q, page: String(page) }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${data.total} products`}
        actions={
          can(user.role, "products.manage") && (
            <Button asChild className="h-10 rounded-sm">
              <Link href="/admin/products/new">
                <Plus className="size-4" /> New product
              </Link>
            </Button>
          )
        }
      />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
          <input name="q" defaultValue={q.q} placeholder="Search name or SKU…" className={inputCls} aria-label="Search" />
          <select name="category" defaultValue={q.category ?? ""} className={inputCls} aria-label="Category">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parent ? `${c.parent.name} / ${c.name}` : c.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={q.status ?? ""} className={inputCls} aria-label="Status">
            <option value="">Any status</option>
            <option value="ACTIVE">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <Button type="submit" className="h-10 rounded-sm">
            Filter
          </Button>
        </form>
      </Card>
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Available</th>
                {canEdit && <th className="px-4 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-4 py-16 text-center text-muted-foreground">
                    No products found.
                  </td>
                </tr>
              ) : (
                data.items.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <span className="relative h-14 w-11 shrink-0 overflow-hidden bg-secondary">
                          {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="44px" className="object-cover" />}
                        </span>
                        <span>
                          <span className="font-medium hover:underline">{p.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {p.sku} · {p.variantCount} variants
                            {p.flags.featured && " · Featured"}
                            {p.flags.newArrival && " · New"}
                            {p.flags.bestSeller && " · Best seller"}
                            {p.condition && ` · Pre-loved (${p.condition.replace(/_/g, " ").toLowerCase()})`}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">{p.category}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`rounded-sm px-2 py-0.5 ${p.status === "ACTIVE" ? "bg-emerald-50 text-emerald-800" : p.status === "DRAFT" ? "bg-amber-50 text-amber-800" : "bg-neutral-100 text-neutral-600"}`}>
                        {p.status === "ACTIVE" ? "Published" : p.status === "DRAFT" ? "Draft" : "Archived"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {p.salePriceCents !== null ? (
                        <>
                          <span className="text-destructive">{formatMoney(p.salePriceCents, settings.currency)}</span>{" "}
                          <span className="text-xs text-muted-foreground line-through">{formatMoney(p.priceCents, settings.currency)}</span>
                        </>
                      ) : (
                        formatMoney(p.priceCents, settings.currency)
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${p.available === 0 ? "text-destructive" : ""}`}>
                      {p.available} <span className="text-xs text-muted-foreground">/ {p.stock}</span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <ProductQuickEdit productId={p.id} productName={p.name} />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <AdminPagination page={data.page} pageCount={data.pageCount} href={(p) => `/admin/products?${qs(p)}`} />
    </div>
  );
}

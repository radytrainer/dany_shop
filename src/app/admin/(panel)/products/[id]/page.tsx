import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/admin-ui";
import { ProductEditor, type EditorInitial } from "@/components/admin/product-editor";
import { getEditorOptions } from "../editor-data";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const user = await requireAdminPage("products.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [p, options] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { include: { size: true, color: true } },
        translations: { where: { locale: "km" } },
        collections: { select: { collectionId: true } },
      },
    }),
    getEditorOptions(),
  ]);
  if (!p) notFound();
  const km = p.translations[0];
  const initial: EditorInitial = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    shortDescription: p.shortDescription ?? "",
    description: p.description,
    categoryId: p.categoryId,
    brand: p.brand ?? "",
    price: p.price.toFixed(2),
    salePrice: p.salePrice?.toFixed(2) ?? "",
    status: p.status,
    isFeatured: p.isFeatured,
    isNewArrival: p.isNewArrival,
    isBestSeller: p.isBestSeller,
    tags: p.tags,
    lowStockThreshold: p.lowStockThreshold,
    condition: p.condition,
    km: { name: km?.name ?? "", shortDescription: km?.shortDescription ?? "", description: km?.description ?? "" },
    images: p.images.map((i) => ({ id: i.id, url: i.url, storageKey: i.storageKey, alt: i.alt ?? "", colorId: i.colorId })),
    featuredImageIndex: Math.max(0, p.images.findIndex((i) => i.isFeatured)),
    variants: p.variants
      .sort((a, b) => a.color.sortOrder - b.color.sortOrder || a.size.sortOrder - b.size.sortOrder)
      .map((v) => ({
        id: v.id,
        sizeId: v.sizeId,
        colorId: v.colorId,
        sku: v.sku,
        priceOverride: v.priceOverride?.toFixed(2) ?? "",
        stock: v.stock,
        reserved: v.reserved,
        isActive: v.isActive,
      })),
    collectionIds: p.collections.map((c) => c.collectionId),
  };
  return (
    <div>
      <PageHeader
        title={p.name}
        description={`SKU ${p.sku}`}
        actions={
          p.status === "ACTIVE" && (
            <Link href={`/products/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">
              View in store <ExternalLink className="size-3.5" />
            </Link>
          )
        }
      />
      <ProductEditor options={options} initial={initial} readOnly={!can(user.role, "products.manage")} />
    </div>
  );
}

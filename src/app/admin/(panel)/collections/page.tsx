import { requireAdminPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/admin-ui";
import { CollectionManager } from "@/components/admin/collection-manager";

export const metadata = { title: "Collections" };

export default async function CollectionsAdminPage() {
  await requireAdminPage("content.manage");
  const [collections, products] = await Promise.all([
    prisma.collection.findMany({ orderBy: { sortOrder: "asc" }, include: { products: { orderBy: { sortOrder: "asc" }, select: { productId: true } } } }),
    prisma.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true, sku: true } }),
  ]);
  return (
    <div>
      <PageHeader title="Collections" description="Curated edits such as Summer Collection. Featured collections appear on the homepage." />
      <CollectionManager
        products={products.map((p) => ({ id: p.id, name: `${p.name} (${p.sku})` }))}
        collections={collections.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description ?? "",
          imageUrl: c.imageUrl,
          bannerUrl: c.bannerUrl,
          isActive: c.isActive,
          isFeatured: c.isFeatured,
          sortOrder: c.sortOrder,
          productIds: c.products.map((p) => p.productId),
          km: ((c.translations as Record<string, Record<string, string>>) ?? {}).km ?? {},
        }))}
      />
    </div>
  );
}

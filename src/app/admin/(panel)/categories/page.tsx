import { requireAdminPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/admin-ui";
import { CategoryManager, type AdminCategory } from "@/components/admin/category-manager";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireAdminPage("categories.manage");
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { translations: { where: { locale: "km" } }, _count: { select: { products: true, children: true } } },
  });
  const cats: AdminCategory[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? "",
    parentId: c.parentId,
    imageUrl: c.imageUrl,
    bannerUrl: c.bannerUrl,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    isFeatured: c.isFeatured,
    nameKm: c.translations[0]?.name ?? "",
    descriptionKm: c.translations[0]?.description ?? "",
    productCount: c._count.products,
    childCount: c._count.children,
  }));
  return (
    <div>
      <PageHeader title="Categories" description="Two levels: top-level categories (e.g. Women) and subcategories (e.g. Dresses). Inactive categories are hidden from the store." />
      <CategoryManager categories={cats} />
    </div>
  );
}

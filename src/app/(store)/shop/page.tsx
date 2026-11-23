import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { getCategoryTree } from "@/services/catalog";
import { ProductListingView } from "@/components/shop/product-listing-view";
import type { CategoryFacet } from "@/components/shop/listing-filters";

export async function generateMetadata({ searchParams }: PageProps<"/shop">): Promise<Metadata> {
  const { t } = await getI18n();
  const sp = await searchParams;
  const title = sp.new === "1" ? t("nav.newArrivals") : sp.sale === "1" ? t("nav.sale") : t("shop.allProducts");
  return { title, alternates: { canonical: "/shop" } };
}

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const { locale, t } = await getI18n();
  const sp = await searchParams;
  const tree = await getCategoryTree(locale);
  const categories: CategoryFacet[] = tree.flatMap((root) => [
    { slug: root.slug, name: root.name, active: false, depth: 0 },
    ...root.children.map((c) => ({ slug: c.slug, name: c.name, active: false, depth: 1 })),
  ]);
  const title = sp.new === "1" ? t("nav.newArrivals") : sp.sale === "1" ? t("nav.sale") : t("shop.allProducts");
  return (
    <ProductListingView
      title={title}
      breadcrumbs={[
        { href: "/", label: t("nav.home") },
        { href: "/shop", label: t("nav.shop") },
      ]}
      scope={{}}
      searchParams={sp}
      basePath="/shop"
      categories={categories}
    />
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { findCategory, getCategoryTree } from "@/services/catalog";
import { ProductListingView } from "@/components/shop/product-listing-view";
import type { CategoryFacet } from "@/components/shop/listing-filters";
import { JsonLd } from "@/components/shared/json-ld";

async function load(slug: string) {
  const { locale } = await getI18n();
  const tree = await getCategoryTree(locale);
  return { tree, found: findCategory(tree, slug) };
}

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { found } = await load(slug);
  if (!found) return {};
  const { node } = found;
  return {
    title: node.name,
    description: node.description ?? undefined,
    alternates: { canonical: `/categories/${node.slug}` },
    openGraph: { title: node.name, description: node.description ?? undefined, images: node.bannerUrl ?? node.imageUrl ?? undefined },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const { t } = await getI18n();
  const { found } = await load(slug);
  if (!found) notFound();
  const { node, path } = found;
  const root = path[0];

  const categories: CategoryFacet[] = [
    { slug: root.slug, name: root.name, active: root.slug === node.slug, depth: 0 },
    ...root.children.map((c) => ({ slug: c.slug, name: c.name, active: c.slug === node.slug, depth: 1 })),
  ];
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [{ name: t("nav.home"), item: appUrl }, ...path.map((c) => ({ name: c.name, item: `${appUrl}/categories/${c.slug}` }))].map(
            (x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, item: x.item }),
          ),
        }}
      />
      <ProductListingView
        title={node.name}
        description={node.description}
        bannerUrl={node.bannerUrl}
        breadcrumbs={[{ href: "/", label: t("nav.home") }, ...path.map((c) => ({ href: `/categories/${c.slug}`, label: c.name }))]}
        scope={{ category: node.slug }}
        searchParams={await searchParams}
        basePath={`/categories/${node.slug}`}
        categories={categories}
      />
    </>
  );
}

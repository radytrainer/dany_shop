import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getCollectionBySlug } from "@/services/content";
import { getStoreSettings } from "@/services/settings";
import { ProductListingView } from "@/components/shop/product-listing-view";

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getI18n();
  const c = await getCollectionBySlug(slug, locale);
  if (!c) return {};
  return {
    title: c.name,
    description: c.description ?? undefined,
    alternates: { canonical: `/collections/${c.slug}` },
    openGraph: { title: c.name, images: c.bannerUrl ?? c.imageUrl ?? undefined },
  };
}

export default async function CollectionPage({ params, searchParams }: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const { locale, t } = await getI18n();
  const c = (await getStoreSettings()).showCollections ? await getCollectionBySlug(slug, locale) : null;
  if (!c) notFound();
  return (
    <ProductListingView
      title={c.name}
      description={c.description}
      bannerUrl={c.bannerUrl}
      breadcrumbs={[
        { href: "/", label: t("nav.home") },
        { href: "/collections", label: t("nav.collections") },
        { href: `/collections/${c.slug}`, label: c.name },
      ]}
      scope={{ collection: c.slug }}
      searchParams={await searchParams}
      basePath={`/collections/${c.slug}`}
    />
  );
}

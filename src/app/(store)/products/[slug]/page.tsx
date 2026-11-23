import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Truck } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getProductBySlug, getRelatedProducts, recordProductView } from "@/services/catalog";
import { getStoreSettings, localizedSetting } from "@/services/settings";
import { fromCents } from "@/lib/money";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProductDetailView } from "@/components/products/product-detail-view";
import { RecentlyViewed } from "@/components/products/recently-viewed";
import { RailSection } from "@/components/home/home-sections";
import { JsonLd } from "@/components/shared/json-ld";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getI18n();
  const p = await getProductBySlug(slug, locale);
  if (!p) return { title: "Not found" };
  const description = p.shortDescription ?? p.description.slice(0, 160);
  return {
    title: p.name,
    description,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.name, description, type: "website", images: p.images.slice(0, 4).map((i) => ({ url: i.url, alt: i.alt ?? p.name })) },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const { locale, t } = await getI18n();
  const product = await getProductBySlug(slug, locale);
  if (!product) notFound();
  recordProductView(product.id);

  const [related, settings] = await Promise.all([getRelatedProducts(product, locale), getStoreSettings()]);
  const shipping = localizedSetting(settings, "shippingInfo", locale);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const inStock = product.variants.some((v) => v.available > 0);
  const prices = product.variants.map((v) => v.priceCents);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          sku: product.sku,
          description: product.shortDescription ?? product.description,
          image: product.images.map((i) => i.url),
          brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
          category: product.category.name,
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: product.currency,
            lowPrice: fromCents(Math.min(...prices, product.priceCents)),
            highPrice: fromCents(Math.max(...prices, product.priceCents)),
            offerCount: product.variants.length,
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${appUrl}/products/${product.slug}`,
          },
        }}
      />
      <div className="container-page pt-4 pb-10 lg:pt-8">
        <nav aria-label={t("a11y.breadcrumb")} className="mb-4 hidden text-xs text-muted-foreground lg:block">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:underline">
                {t("nav.home")}
              </Link>
            </li>
            {product.breadcrumbs.map((b) => (
              <li key={b.slug} className="flex items-center gap-1.5">
                <span aria-hidden>/</span>
                <Link href={`/categories/${b.slug}`} className="hover:underline">
                  {b.name}
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span aria-hidden>/</span>
              <span aria-current="page">{product.name}</span>
            </li>
          </ol>
        </nav>

        <ProductDetailView product={product}>
          <Accordion type="multiple" defaultValue={["description"]} className="mt-8 border-t">
            <AccordionItem value="description">
              <AccordionTrigger className="text-xs font-semibold tracking-wider uppercase">{t("product.description")}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{product.description}</div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="details">
              <AccordionTrigger className="text-xs font-semibold tracking-wider uppercase">{t("product.details")}</AccordionTrigger>
              <AccordionContent>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">{t("product.sku")}</dt>
                  <dd>{product.sku}</dd>
                  <dt className="text-muted-foreground">{t("product.category")}</dt>
                  <dd>
                    <Link href={`/categories/${product.category.slug}`} className="underline underline-offset-4">
                      {product.category.name}
                    </Link>
                  </dd>
                  {product.brand && (
                    <>
                      <dt className="text-muted-foreground">{t("product.brand")}</dt>
                      <dd>{product.brand}</dd>
                    </>
                  )}
                  {product.tags.length > 0 && (
                    <>
                      <dt className="text-muted-foreground">{t("product.tags")}</dt>
                      <dd className="flex flex-wrap gap-1.5">
                        {product.tags.map((tag) => (
                          <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`} className="bg-secondary px-2 py-0.5 text-xs hover:underline">
                            {tag}
                          </Link>
                        ))}
                      </dd>
                    </>
                  )}
                </dl>
              </AccordionContent>
            </AccordionItem>
            {shipping && (
              <AccordionItem value="shipping">
                <AccordionTrigger className="text-xs font-semibold tracking-wider uppercase">
                  <span className="inline-flex items-center gap-2">
                    <Truck className="size-4" aria-hidden /> {t("product.shipping")}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{shipping}</p>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </ProductDetailView>
      </div>

      <RailSection title={t("product.relatedProducts")} href={`/categories/${product.category.slug}`} products={related} t={t} />
      <RecentlyViewed currentSlug={product.slug} />
      {/* Spacer so the sticky mobile add-to-cart bar never covers content. */}
      <div className="h-20 md:hidden" aria-hidden />
    </>
  );
}

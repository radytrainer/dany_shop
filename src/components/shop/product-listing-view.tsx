import Image from "next/image";
import Link from "next/link";
import { SearchX, Shirt } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getListingFacets, listProducts } from "@/services/catalog";
import { productQuerySchema, searchParamsToRecord, type ProductQuery } from "@/lib/validations/catalog";
import { ProductGrid } from "@/components/products/product-grid";
import { EmptyState } from "@/components/shared/empty-state";
import { ActiveFilters, FilterSidebar, MobileFilterSheet, SortSelect, type CategoryFacet } from "./listing-filters";
import { Pagination } from "./pagination";

type Scope = Pick<ProductQuery, "category" | "collection" | "q">;

export async function ProductListingView({
  title,
  description,
  bannerUrl,
  breadcrumbs = [],
  scope,
  searchParams,
  basePath,
  categories = [],
  emptyKind = "category",
}: {
  title: string;
  description?: string | null;
  bannerUrl?: string | null;
  breadcrumbs?: { href: string; label: string }[];
  scope: Scope;
  searchParams: Record<string, string | string[] | undefined>;
  basePath: string;
  categories?: CategoryFacet[];
  emptyKind?: "category" | "search";
}) {
  const { locale, t } = await getI18n();
  const query = productQuerySchema.parse({ ...searchParamsToRecord(searchParams), ...scope });
  const [listing, facets] = await Promise.all([listProducts(query, locale), getListingFacets(scope, locale)]);
  const hasFilters = ["sizes", "colors", "brands", "minPrice", "maxPrice", "inStock", "sale", "new"].some((k) => searchParams[k]);

  return (
    <div>
      {bannerUrl ? (
        <section className="relative h-[240px] overflow-hidden bg-secondary sm:h-[340px]">
          <Image src={bannerUrl} alt="" fill priority sizes="100vw" className="object-cover object-[center_30%]" />
          <div className="absolute inset-0 bg-black/30" />
          <div className="container-page relative flex h-full flex-col justify-end pb-8 text-white">
            <Breadcrumbs items={breadcrumbs} light label={t("a11y.breadcrumb")} />
            <h1 className="font-heading text-4xl sm:text-6xl">{title}</h1>
            {description && <p className="mt-2 max-w-xl text-sm text-white/85">{description}</p>}
          </div>
        </section>
      ) : (
        <section className="container-page pt-8 pb-2 sm:pt-12">
          <Breadcrumbs items={breadcrumbs} label={t("a11y.breadcrumb")} />
          <h1 className="font-heading text-4xl sm:text-5xl">{title}</h1>
          {description && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>}
        </section>
      )}

      <div className="container-page pt-6 sm:pt-8">
        <div className="mb-6 flex items-center justify-between gap-3 border-b pb-4">
          <p className="text-xs text-muted-foreground" aria-live="polite" data-testid="product-count">
            {t("shop.productCount", { count: listing.total })}
          </p>
          <div className="flex items-center gap-2">
            <MobileFilterSheet facets={facets} categories={categories} total={listing.total} />
            <SortSelect className="hidden lg:flex" />
          </div>
        </div>

        <div className="flex gap-10">
          <FilterSidebar facets={facets} categories={categories} />
          <div className="min-w-0 flex-1">
            <ActiveFilters facets={facets} />
            {listing.items.length === 0 ? (
              hasFilters ? (
                <EmptyState icon={SearchX} title={t("shop.noResults")} body={t("shop.noResultsBody")} action={{ label: t("shop.resetFilters"), href: basePath + (scope.q ? `?q=${encodeURIComponent(scope.q)}` : "") }} />
              ) : emptyKind === "search" ? (
                <EmptyState
                  icon={SearchX}
                  title={t("search.noResults", { query: scope.q ?? "" })}
                  body={t("search.noResultsBody")}
                  action={{ label: t("nav.shopAll"), href: "/shop" }}
                />
              ) : (
                <EmptyState icon={Shirt} title={t("shop.emptyCategory")} body={t("shop.emptyCategoryBody")} action={{ label: t("nav.shopAll"), href: "/shop" }} />
              )
            ) : (
              <>
                <ProductGrid products={listing.items} className="xl:grid-cols-3 2xl:grid-cols-4" />
                <Pagination page={listing.page} pageCount={listing.pageCount} basePath={basePath} searchParams={searchParams} t={t} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Breadcrumbs({ items, light = false, label }: { items: { href: string; label: string }[]; light?: boolean; label: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={label} className={`mb-3 text-xs ${light ? "text-white/80" : "text-muted-foreground"}`}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((b, i) => (
          <li key={b.href} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {i === items.length - 1 ? <span aria-current="page">{b.label}</span> : <Link href={b.href} className="hover:underline">{b.label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

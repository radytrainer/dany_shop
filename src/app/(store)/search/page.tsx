import type { Metadata } from "next";
import { Search } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { ProductListingView } from "@/components/shop/product-listing-view";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchPageForm } from "@/components/shop/search-page-form";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const { t } = await getI18n();
  const q = (await searchParams).q;
  return { title: typeof q === "string" && q ? t("search.resultsFor", { query: q }) : t("search.title"), robots: { index: false } };
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { t } = await getI18n();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  return (
    <>
      <div className="container-page pt-8">
        <SearchPageForm initial={q} />
      </div>
      {q ? (
        <ProductListingView
          title={t("search.resultsFor", { query: q })}
          scope={{ q }}
          searchParams={sp}
          basePath="/search"
          emptyKind="search"
        />
      ) : (
        <EmptyState icon={Search} title={t("search.title")} body={t("search.typeToSearch")} />
      )}
    </>
  );
}

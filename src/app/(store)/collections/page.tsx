import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Layers } from "lucide-react";
import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getStoreSettings } from "@/services/settings";
import { listCollections } from "@/services/content";
import { EmptyState } from "@/components/shared/empty-state";
import { Reveal } from "@/components/shared/reveal";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.collections"), alternates: { canonical: "/collections" } };
}

export default async function CollectionsPage() {
  if (!(await getStoreSettings()).showCollections) notFound();
  const { locale, t } = await getI18n();
  const collections = await listCollections(locale);
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="font-heading text-4xl sm:text-5xl">{t("nav.collections")}</h1>
      {collections.length === 0 ? (
        <EmptyState icon={Layers} title={t("shop.emptyCategory")} body={t("shop.emptyCategoryBody")} action={{ label: t("nav.shopAll"), href: "/shop" }} />
      ) : (
        <div className="mt-10 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c, i) => (
            <Reveal key={c.id} delay={(i % 3) * 0.08}>
              <Link href={`/collections/${c.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                  {c.imageUrl && (
                    <Image src={c.imageUrl} alt={c.name} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-[1.2s] ease-luxe group-hover:scale-105" />
                  )}
                </div>
                <h2 className="mt-4 font-heading text-2xl">{c.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{t("shop.productCount", { count: c.productCount })}</p>
                {c.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

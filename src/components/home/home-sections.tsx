import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { InstagramIcon } from "@/components/shared/brand-icons";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { ProductRail } from "@/components/products/product-rail";
import { NewsletterForm } from "./newsletter-form";
import type { BannerDTO, CollectionDTO } from "@/services/content";
import type { CategoryNode, ProductCardDTO } from "@/types/catalog";
import type { Translator } from "@/i18n/translator";

export function RailSection({
  title,
  subtitle,
  href,
  products,
  t,
}: {
  title: string;
  subtitle?: string;
  href: string;
  products: ProductCardDTO[];
  t: Translator;
}) {
  if (products.length === 0) return null;
  return (
    <section className="container-page py-12 lg:py-20">
      <Reveal>
        <SectionHeading title={title} subtitle={subtitle} href={href} linkLabel={t("common.viewAll")} />
      </Reveal>
      <ProductRail products={products} label={title} />
    </section>
  );
}

export function CategoryTiles({ categories, t }: { categories: CategoryNode[]; t: Translator }) {
  const tiles = categories.filter((c) => c.imageUrl);
  if (tiles.length === 0) return null;
  return (
    <section className="container-page py-12 lg:py-20">
      <Reveal>
        <SectionHeading title={t("home.shopByCategory")} />
      </Reveal>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
        {tiles.map((c, i) => (
          <Reveal key={c.id} delay={i * 0.08} className={i === 0 ? "col-span-2 md:col-span-1" : ""}>
            <Link href={`/categories/${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-secondary md:aspect-[3/4]">
              <Image
                src={c.imageUrl!}
                alt={c.name}
                fill
                sizes="(min-width: 768px) 33vw, 50vw"
                className="object-cover transition-transform duration-[1.2s] ease-luxe group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 text-white sm:p-6">
                <div>
                  <h3 className="font-heading text-2xl sm:text-3xl">{c.name}</h3>
                  {c.children.length > 0 && (
                    <p className="mt-1 hidden text-xs text-white/80 sm:block">
                      {c.children
                        .slice(0, 4)
                        .map((x) => x.name)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function PromoBanner({ banner }: { banner: BannerDTO }) {
  return (
    <section className="py-6 lg:py-10">
      <Reveal className="relative overflow-hidden bg-foreground text-white">
        <div className="relative h-[460px] sm:h-[420px] lg:h-[520px]">
          <Image src={banner.imageUrl} alt="" fill sizes="100vw" className="object-cover opacity-60" />
          <div className="container-page relative flex h-full flex-col items-start justify-center">
            {banner.subtitle && <p className="mb-3 text-[11px] font-semibold tracking-[0.3em] uppercase">{banner.subtitle}</p>}
            <h2 className="max-w-2xl font-heading text-4xl leading-tight sm:text-5xl lg:text-6xl">{banner.title}</h2>
            {banner.description && <p className="mt-4 max-w-md text-sm text-white/85 sm:text-base">{banner.description}</p>}
            {banner.ctaLabel && banner.ctaHref && (
              <Button asChild size="xl" className="mt-8 bg-white text-foreground hover:bg-white/90">
                <Link href={banner.ctaHref}>{banner.ctaLabel}</Link>
              </Button>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function CollectionsGrid({ collections, t }: { collections: CollectionDTO[]; t: Translator }) {
  if (collections.length === 0) return null;
  return (
    <section className="container-page py-12 lg:py-20">
      <Reveal>
        <SectionHeading title={t("home.featuredCollections")} href="/collections" linkLabel={t("common.viewAll")} />
      </Reveal>
      <div className="grid gap-5 md:grid-cols-3">
        {collections.slice(0, 3).map((c, i) => (
          <Reveal key={c.id} delay={i * 0.1}>
            <Link href={`/collections/${c.slug}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                {c.imageUrl && (
                  <Image
                    src={c.imageUrl}
                    alt={c.name}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-[1.2s] ease-luxe group-hover:scale-105"
                  />
                )}
              </div>
              <h3 className="mt-4 font-heading text-2xl">{c.name}</h3>
              {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
              <span className="mt-3 inline-block text-xs font-semibold tracking-[0.14em] uppercase underline underline-offset-4">
                {t("home.exploreCollection")}
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Lookbook({ banners, t }: { banners: BannerDTO[]; t: Translator }) {
  if (banners.length === 0) return null;
  const [lead, ...rest] = banners;
  return (
    <section className="bg-secondary py-14 lg:py-24">
      <div className="container-page">
        <Reveal>
          <SectionHeading title={t("home.lookbook")} align="center" />
        </Reveal>
        <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
          <Reveal>
            <LookCard banner={lead} tall />
          </Reveal>
          <div className="grid gap-4 lg:gap-6">
            {rest.slice(0, 2).map((b, i) => (
              <Reveal key={b.id} delay={0.1 * (i + 1)}>
                <LookCard banner={b} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LookCard({ banner, tall = false }: { banner: BannerDTO; tall?: boolean }) {
  const inner = (
    <div className={`group relative overflow-hidden bg-background ${tall ? "aspect-[4/5] md:h-full md:aspect-auto" : "aspect-[16/10]"}`}>
      <Image
        src={banner.imageUrl}
        alt={banner.title}
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover transition-transform duration-[1.4s] ease-luxe group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute bottom-0 left-0 p-5 text-white sm:p-7">
        {banner.subtitle && <p className="text-[11px] font-semibold tracking-[0.3em] uppercase">{banner.subtitle}</p>}
        <h3 className="mt-1 font-heading text-3xl">{banner.title}</h3>
        {banner.ctaLabel && <span className="mt-3 inline-block text-xs font-semibold tracking-[0.14em] uppercase underline underline-offset-4">{banner.ctaLabel}</span>}
      </div>
    </div>
  );
  return banner.ctaHref ? (
    <Link href={banner.ctaHref} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function NewsletterSection({ t }: { t: Translator }) {
  return (
    <section className="container-page py-16 lg:py-24">
      <Reveal className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <p className="eyebrow">{t("home.newsletterTitle")}</p>
        <h2 className="mt-3 font-heading text-3xl sm:text-4xl">{t("home.newsletterBody")}</h2>
        <NewsletterForm className="mt-8" />
      </Reveal>
    </section>
  );
}

export function SocialGallery({ items, href, t }: { items: { imageUrl: string; href?: string }[]; href?: string; t: Translator }) {
  if (items.length === 0) return null;
  return (
    <section className="py-12 lg:py-16">
      <div className="container-page">
        <Reveal>
          <SectionHeading title={t("home.socialTitle")} href={href} linkLabel={t("home.socialFollow")} />
        </Reveal>
      </div>
      <div className="grid grid-cols-3 gap-1 md:grid-cols-6">
        {items.slice(0, 6).map((item, i) => (
          <a
            key={i}
            href={item.href ?? href ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square overflow-hidden bg-secondary"
            aria-label={t("a11y.socialPost", { number: i + 1 })}
          >
            <Image src={item.imageUrl} alt="" fill sizes="(min-width: 768px) 17vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
              <InstagramIcon className="size-6" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

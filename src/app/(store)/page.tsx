import Link from "next/link";
import { Shirt } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getCategoryTree, getProductRail } from "@/services/catalog";
import { getBanners, listCollections } from "@/services/content";
import { getStoreSettings, localizedSetting } from "@/services/settings";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { RunwayHero } from "@/components/home/runway-hero";
import {
  CategoryTiles,
  CollectionsGrid,
  Lookbook,
  NewsletterSection,
  PromoBanner,
  RailSection,
  SocialGallery,
} from "@/components/home/home-sections";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const { locale, t } = await getI18n();
  const settings = await getStoreSettings();
  const [heroes, promos, editorial, tree, collections, newArrivals, bestSellers, trending, offers, looks] = await Promise.all([
    getBanners("HERO", locale),
    getBanners("PROMO", locale),
    getBanners("EDITORIAL", locale),
    getCategoryTree(locale),
    listCollections(locale, true),
    getProductRail("new", locale, 10),
    getProductRail("best", locale, 10),
    getProductRail("trending", locale, 10),
    getProductRail("sale", locale, 10),
    getProductRail("featured", locale, 8),
  ]);
  const hasProducts = newArrivals.length + bestSellers.length + trending.length > 0;
  const tagline = localizedSetting(settings, "tagline", locale);

  const sections: Record<string, React.ReactNode> = {
    hero:
      looks.length > 0 ? (
        <RunwayHero banner={heroes[0] ?? null} looks={looks} fallbackTitle={settings.storeName} fallbackText={tagline} />
      ) : heroes.length > 0 ? (
        <HeroCarousel banners={heroes} />
      ) : (
        <section className="bg-secondary">
          <div className="container-page flex min-h-[60svh] flex-col items-center justify-center py-20 text-center">
            <h1 className="font-heading text-5xl tracking-[0.12em] uppercase sm:text-7xl">{settings.storeName}</h1>
            {tagline && <p className="mt-4 max-w-md text-muted-foreground">{tagline}</p>}
            <Button asChild size="xl" className="mt-8">
              <Link href="/shop">{t("home.shopNow")}</Link>
            </Button>
          </div>
        </section>
      ),
    categories: <CategoryTiles categories={tree} t={t} />,
    newArrivals: (
      <RailSection title={t("home.newArrivals")} subtitle={t("home.newArrivalsSub")} href="/shop?new=1" products={newArrivals} t={t} />
    ),
    promo: promos[0] ? <PromoBanner banner={promos[0]} /> : null,
    bestSellers: (
      <RailSection title={t("home.bestSellers")} subtitle={t("home.bestSellersSub")} href="/shop?sort=best" products={bestSellers} t={t} />
    ),
    collections: settings.showCollections ? <CollectionsGrid collections={collections} t={t} /> : null,
    trending: <RailSection title={t("home.trending")} subtitle={t("home.trendingSub")} href="/shop?sort=popular" products={trending} t={t} />,
    offers: <RailSection title={t("home.specialOffers")} subtitle={t("home.specialOffersSub")} href="/shop?sale=1" products={offers} t={t} />,
    editorial: <Lookbook banners={editorial} t={t} />,
    newsletter: <NewsletterSection t={t} />,
    social: <SocialGallery items={settings.socialGallery} href={settings.socialLinks.instagram} t={t} />,
  };

  return (
    <>
      {settings.homepageSections
        .filter((s) => s.enabled)
        .map((s) => {
          if (!hasProducts && ["newArrivals", "bestSellers", "trending", "offers"].includes(s.key)) {
            return s.key === "newArrivals" ? <EmptyState key={s.key} icon={Shirt} title={t("home.emptyStore")} body={t("home.emptyStoreBody")} /> : null;
          }
          return <div key={s.key}>{sections[s.key]}</div>;
        })}
    </>
  );
}

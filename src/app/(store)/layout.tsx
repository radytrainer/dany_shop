import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
import { getCategoryTree } from "@/services/catalog";
import { listCollections } from "@/services/content";
import { getStoreSettings, localizedSetting } from "@/services/settings";
import { SessionProvider } from "@/features/session/session-provider";
import { StoreProvider } from "@/features/store/store-provider";
import { CartProvider } from "@/features/cart/cart-provider";
import { WishlistProvider } from "@/features/wishlist/wishlist-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { InstallBanner, ServiceWorkerRegistrar } from "@/features/pwa/pwa";
import type { HeaderNav } from "@/components/layout/nav-types";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const { locale, t } = await getI18n();
  const [settings, tree, collections, user] = await Promise.all([
    getStoreSettings(),
    getCategoryTree(locale),
    listCollections(locale),
    getCurrentUser(),
  ]);

  const nav: HeaderNav = {
    groups: tree.map((root) => ({
      key: root.slug,
      label: root.name,
      href: `/categories/${root.slug}`,
      imageUrl: root.imageUrl,
      links: root.children.map((c) => ({ href: `/categories/${c.slug}`, label: c.name })),
    })),
    collections: settings.showCollections ? collections.map((c) => ({ href: `/collections/${c.slug}`, label: c.name })) : [],
    showCollections: settings.showCollections,
  };

  const announcement = settings.announcementActive ? localizedSetting(settings, "announcementText", locale) : null;

  return (
    <SessionProvider user={user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null}>
      <StoreProvider
        config={{
          storeName: settings.storeName,
          logoUrl: settings.logoUrl,
          currency: settings.currency,
          khrExchangeRate: settings.khrExchangeRate,
          showKhrEquivalent: settings.showKhrEquivalent,
          telegramUsername: settings.telegramUsername,
          messengerUrl: settings.messengerUrl,
          whatsappNumber: settings.whatsappNumber,
          defaultChannel: settings.defaultChannel,
          sizeGuide: localizedSetting(settings, "sizeGuide", locale),
          shippingInfo: localizedSetting(settings, "shippingInfo", locale),
        }}
      >
        <CartProvider>
          <WishlistProvider>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-background focus:px-4 focus:py-2">
              {t("a11y.skipToContent")}
            </a>
            {announcement && (
              <div className="bg-foreground text-background">
                <div className="container-page flex h-9 items-center justify-center text-center text-[11px] font-medium tracking-[0.12em] uppercase sm:text-xs">
                  {settings.announcementHref ? (
                    <Link href={settings.announcementHref} className="truncate hover:underline">
                      {announcement}
                    </Link>
                  ) : (
                    <span className="truncate">{announcement}</span>
                  )}
                </div>
              </div>
            )}
            <SiteHeader storeName={settings.storeName} logoUrl={settings.logoUrl} nav={nav} />
            <main id="main" className="min-h-[60dvh]">
              {children}
            </main>
            <SiteFooter settings={settings} footerText={localizedSetting(settings, "footerText", locale)} address={localizedSetting(settings, "address", locale)} groups={nav.groups} showCollections={settings.showCollections} t={t} />
            <BottomNav />
            <CartDrawer />
            <InstallBanner />
            <ServiceWorkerRegistrar />
          </WishlistProvider>
        </CartProvider>
      </StoreProvider>
    </SessionProvider>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/features/cart/cart-provider";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { CartCount } from "./cart-count";
import { MobileMenu } from "./mobile-menu";
import { BrandLogo } from "@/components/shared/brand-logo";
import { SearchOverlay } from "./search-overlay";
import { LanguageToggle } from "./language-switcher";
import type { HeaderNav } from "./nav-types";

export function SiteHeader({ storeName, logoUrl, nav }: { storeName: string; logoUrl: string | null; nav: HeaderNav }) {
  const { t } = useI18n();
  const cart = useCart();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const frame = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Close menus when the route changes (adjusting state during render, per React guidance).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpenGroup(null);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0]));
  const activeGroup = nav.groups.find((g) => g.key === openGroup);

  const logo = <BrandLogo logoUrl={logoUrl} storeName={storeName} priority className="h-7 lg:h-9" textClassName="text-[26px]" />;

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-[background-color,box-shadow,border-color] duration-300",
          scrolled || openGroup ? "border-b border-border bg-background/95 backdrop-blur-md" : "border-b border-transparent bg-background",
        )}
        onMouseLeave={() => setOpenGroup(null)}
      >
        <div className="container-page grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-[72px]">
          {/* Left: mobile menu / desktop nav */}
          <div className="flex items-center">
            <button type="button" className="-ml-2 p-2 lg:hidden" onClick={() => setMenuOpen(true)} aria-label={t("nav.openMenu")} aria-expanded={menuOpen}>
              <Menu className="size-[22px]" strokeWidth={1.5} />
            </button>
            <nav className="hidden items-center gap-7 lg:flex" aria-label={t("a11y.mainNav")}>
              <Link href="/shop" className={cn("nav-link text-[13px] font-medium tracking-wide", isActive("/shop") && "underline underline-offset-8")}>
                {t("nav.shop")}
              </Link>
              {nav.groups.map((g) => (
                <Link
                  key={g.key}
                  href={g.href}
                  onMouseEnter={() => setOpenGroup(g.key)}
                  onFocus={() => setOpenGroup(g.key)}
                  aria-expanded={openGroup === g.key}
                  className={cn("text-[13px] font-medium tracking-wide underline-offset-8 hover:underline", isActive(g.href) && "underline")}
                >
                  {g.label}
                </Link>
              ))}
              <Link
                href="/shop?new=1"
                onMouseEnter={() => setOpenGroup(null)}
                className="text-[13px] font-medium tracking-wide underline-offset-8 hover:underline"
              >
                {t("nav.newArrivals")}
              </Link>
              {nav.showCollections && (
                <Link
                  href="/collections"
                  onMouseEnter={() => setOpenGroup(null)}
                  className={cn("text-[13px] font-medium tracking-wide underline-offset-8 hover:underline", isActive("/collections") && "underline")}
                >
                  {t("nav.collections")}
                </Link>
              )}
            </nav>
          </div>

          {/* Centre: logo */}
          <Link href="/" aria-label={`${storeName} — ${t("nav.home")}`} className="justify-self-center">
            {logo}
          </Link>

          {/* Right: actions */}
          <div className="flex items-center justify-end gap-0.5 sm:gap-1.5">
            <LanguageToggle className="mr-1" />
            <button type="button" className="p-2" onClick={() => setSearchOpen(true)} aria-label={t("nav.search")} data-testid="open-search">
              <Search className="size-5" strokeWidth={1.5} />
            </button>
            <Link href="/wishlist" className="hidden p-2 sm:inline-flex" aria-label={t("nav.wishlist")}>
              <Heart className="size-5" strokeWidth={1.5} />
            </Link>
            <Link href="/account" className="hidden p-2 sm:inline-flex" aria-label={t("nav.account")}>
              <User className="size-5" strokeWidth={1.5} />
            </Link>
            <button type="button" className="relative -mr-2 p-2" onClick={cart.openDrawer} aria-label={t("nav.cart")} data-testid="open-cart">
              <span className="relative inline-flex">
                <ShoppingBag className="size-5" strokeWidth={1.5} />
                <CartCount />
              </span>
            </button>
          </div>
        </div>

        {/* Desktop mega menu */}
        <AnimatePresence>
          {activeGroup && (
            <motion.div
              key={activeGroup.key}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-full hidden border-b bg-background lg:block"
            >
              <div className="container-page grid grid-cols-[1fr_auto] gap-10 py-10">
                <div>
                  <Link href={activeGroup.href} className="eyebrow mb-5 block hover:text-foreground">
                    {t("nav.shopAll")} {activeGroup.label}
                  </Link>
                  <ul className="grid grid-cols-3 gap-x-10 gap-y-3">
                    {activeGroup.links.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="text-sm underline-offset-4 hover:underline">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                {activeGroup.imageUrl && (
                  <Link href={activeGroup.href} className="relative block aspect-[4/3] w-80 overflow-hidden bg-secondary">
                    <Image src={activeGroup.imageUrl} alt={activeGroup.label} fill sizes="320px" className="object-cover" />
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} nav={nav} storeName={storeName} logoUrl={logoUrl} />
      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

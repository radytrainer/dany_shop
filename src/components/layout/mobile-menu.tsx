"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Heart, Package, User } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/i18n/client";
import { useSessionUser } from "@/features/session/session-provider";
import { LanguageSwitcher } from "./language-switcher";
import { BrandLogo } from "@/components/shared/brand-logo";
import type { HeaderNav } from "./nav-types";

export function MobileMenu({
  open,
  onOpenChange,
  nav,
  storeName,
  logoUrl,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nav: HeaderNav;
  storeName: string;
  logoUrl: string | null;
}) {
  const { t } = useI18n();
  const user = useSessionUser();
  const [expanded, setExpanded] = useState<string | null>(null);
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-[88vw] max-w-sm flex-col gap-0 p-0">
        <SheetTitle className="border-b px-5 py-4 font-normal">
          <BrandLogo logoUrl={logoUrl} storeName={storeName} className="h-7" textClassName="text-2xl" />
        </SheetTitle>
        <nav className="flex-1 overflow-y-auto px-5 py-4" aria-label={t("a11y.mobileNav")}>
          <ul className="divide-y">
            <li>
              <Link href="/" onClick={close} className="block py-4 text-[15px]">
                {t("nav.home")}
              </Link>
            </li>
            <li>
              <Link href="/shop" onClick={close} className="block py-4 text-[15px]">
                {t("nav.shop")}
              </Link>
            </li>
            {nav.groups.map((g) => (
              <li key={g.key}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-4 text-[15px]"
                  onClick={() => setExpanded(expanded === g.key ? null : g.key)}
                  aria-expanded={expanded === g.key}
                >
                  {g.label}
                  <ChevronDown className={`size-4 transition-transform ${expanded === g.key ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {expanded === g.key && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <li>
                        <Link href={g.href} onClick={close} className="block py-2.5 pl-3 text-sm font-medium">
                          {t("nav.shopAll")}
                        </Link>
                      </li>
                      {g.links.map((l) => (
                        <li key={l.href}>
                          <Link href={l.href} onClick={close} className="block py-2.5 pl-3 text-sm text-muted-foreground">
                            {l.label}
                          </Link>
                        </li>
                      ))}
                      <li className="h-2" />
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            ))}
            <li>
              <Link href="/shop?new=1" onClick={close} className="block py-4 text-[15px]">
                {t("nav.newArrivals")}
              </Link>
            </li>
            {nav.showCollections && (
              <li>
                <Link href="/collections" onClick={close} className="block py-4 text-[15px]">
                  {t("nav.collections")}
                </Link>
              </li>
            )}
            <li>
              <Link href="/shop?sale=1" onClick={close} className="block py-4 text-[15px] text-destructive">
                {t("nav.sale")}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="space-y-4 border-t bg-secondary px-5 py-5 pb-safe">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Link href="/account" onClick={close} className="flex flex-col items-center gap-1.5 py-2">
              <User className="size-5" strokeWidth={1.5} />
              {user ? t("nav.account") : t("nav.signIn")}
            </Link>
            <Link href="/wishlist" onClick={close} className="flex flex-col items-center gap-1.5 py-2">
              <Heart className="size-5" strokeWidth={1.5} />
              {t("nav.wishlist")}
            </Link>
            <Link href="/account/orders" onClick={close} className="flex flex-col items-center gap-1.5 py-2">
              <Package className="size-5" strokeWidth={1.5} />
              {t("nav.myOrders")}
            </Link>
          </div>
          <LanguageSwitcher />
        </div>
      </SheetContent>
    </Sheet>
  );
}

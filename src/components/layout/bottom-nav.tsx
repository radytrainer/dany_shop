"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/features/cart/cart-provider";
import { useWishlist } from "@/features/wishlist/wishlist-provider";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { CartCount } from "./cart-count";

/** Fixed mobile bottom navigation (hidden from md up). */
export function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const cart = useCart();
  const wishlist = useWishlist();
  const item = "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium tracking-wide";
  const active = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-md pb-safe md:hidden"
      aria-label={t("a11y.bottomNav")}
    >
      <div className="flex h-14">
        <Link href="/" className={cn(item, active("/") ? "text-foreground" : "text-muted-foreground")} aria-current={active("/") ? "page" : undefined}>
          <Home className="size-5" strokeWidth={1.5} />
          {t("nav.home")}
        </Link>
        <Link href="/shop" className={cn(item, active("/shop") || active("/categories") ? "text-foreground" : "text-muted-foreground")}>
          <LayoutGrid className="size-5" strokeWidth={1.5} />
          {t("nav.shop")}
        </Link>
        <Link href="/wishlist" className={cn(item, active("/wishlist") ? "text-foreground" : "text-muted-foreground")}>
          <span className="relative">
            <Heart className="size-5" strokeWidth={1.5} />
            {wishlist.hydrated && wishlist.productIds.length > 0 && <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-destructive" />}
          </span>
          {t("nav.wishlist")}
        </Link>
        <button type="button" onClick={cart.openDrawer} className={cn(item, "text-muted-foreground")} aria-label={t("nav.cart")}>
          <span className="relative">
            <ShoppingBag className="size-5" strokeWidth={1.5} />
            <CartCount />
          </span>
          {t("nav.cart")}
        </button>
        <Link href="/account" className={cn(item, active("/account") ? "text-foreground" : "text-muted-foreground")}>
          <User className="size-5" strokeWidth={1.5} />
          {t("nav.account")}
        </Link>
      </div>
    </nav>
  );
}

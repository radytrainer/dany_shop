"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductCard } from "./product-card";
import { QuickViewDialog } from "./quick-view-dialog";
import { useWishlist } from "@/features/wishlist/wishlist-provider";
import { useSessionUser } from "@/features/session/session-provider";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/fetcher";
import type { ProductCardDTO } from "@/types/catalog";

export function WishlistView() {
  const { t } = useI18n();
  const user = useSessionUser();
  const wishlist = useWishlist();
  const [loaded, setLoaded] = useState<{ key: string; cards: ProductCardDTO[] } | null>(null);
  const [moving, setMoving] = useState<ProductCardDTO | null>(null);
  const key = wishlist.productIds.join(",");

  useEffect(() => {
    if (!wishlist.hydrated || !key) return;
    let cancelled = false;
    api<ProductCardDTO[]>(`/api/products/cards?ids=${key}`)
      .then((cards) => !cancelled && setLoaded({ key, cards }))
      .catch(() => !cancelled && setLoaded({ key, cards: [] }));
    return () => {
      cancelled = true;
    };
  }, [key, wishlist.hydrated]);

  // Derived: nothing saved → empty; otherwise the most recently loaded cards still in the wishlist.
  const cards = !wishlist.hydrated ? null : !key ? [] : loaded ? loaded.cards : null;
  const visible = cards?.filter((c) => wishlist.has(c.id)) ?? null;

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="font-heading text-4xl sm:text-5xl">{t("wishlist.title")}</h1>
      {!user && wishlist.productIds.length > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("wishlist.signInToSync")}{" "}
          <Link href="/account/login?next=/wishlist" className="underline underline-offset-4">
            {t("nav.signIn")}
          </Link>
        </p>
      )}
      {visible === null ? (
        <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-none" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={Heart} title={t("wishlist.empty")} body={t("wishlist.emptyBody")} action={{ label: t("cart.continueShopping"), href: "/shop" }} />
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((p) => (
            <li key={p.id} className="flex flex-col">
              <ProductCard product={p} />
              <Button variant="outline" className="mt-3 h-10 rounded-sm text-[11px] tracking-[0.14em] uppercase" disabled={!p.inStock} onClick={() => setMoving(p)}>
                {p.inStock ? t("wishlist.moveToCart") : t("product.soldOut")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {moving && (
        <QuickViewDialog
          slug={moving.slug}
          open
          onOpenChange={(o) => !o && setMoving(null)}
          onAdded={() => wishlist.remove(moving.id)}
        />
      )}
    </div>
  );
}

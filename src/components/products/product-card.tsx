"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Eye, ImageOff } from "lucide-react";
import { Price } from "@/components/shared/price";
import { WishlistButton } from "./wishlist-button";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { ProductCardDTO } from "@/types/catalog";

const QuickViewDialog = dynamic(() => import("./quick-view-dialog").then((m) => m.QuickViewDialog), { ssr: false });

export function ProductCard({ product, priority = false, sizes }: { product: ProductCardDTO; priority?: boolean; sizes?: string }) {
  const { t } = useI18n();
  const [quickView, setQuickView] = useState(false);
  const imgSizes = sizes ?? "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw";

  return (
    <article className="group flex flex-col" data-testid="product-card">
      {/* Media: link + overlay controls are siblings (no interactive elements nested inside the link). */}
      <div className="relative overflow-hidden bg-secondary">
        <Link href={`/products/${product.slug}`} className="relative block aspect-[3/4] w-full" aria-label={product.name}>
          {product.imageUrl ? (
            <>
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes={imgSizes}
                priority={priority}
                quality={75}
                className={cn(
                  "object-cover transition-[transform,opacity] duration-700 ease-luxe group-hover:scale-[1.04]",
                  product.hoverImageUrl && "md:group-hover:opacity-0",
                )}
              />
              {product.hoverImageUrl && (
                <Image
                  src={product.hoverImageUrl}
                  alt=""
                  aria-hidden
                  fill
                  sizes={imgSizes}
                  quality={75}
                  className="hidden object-cover opacity-0 transition-[transform,opacity] duration-700 ease-luxe group-hover:scale-[1.04] group-hover:opacity-100 md:block"
                />
              )}
            </>
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              <ImageOff className="size-6" strokeWidth={1.4} aria-hidden />
              <span className="sr-only">{t("product.noImage")}</span>
            </span>
          )}
          {!product.inStock && <span className="absolute inset-0 bg-white/40" aria-hidden />}
        </Link>

        <div className="pointer-events-none absolute top-2 left-2 flex flex-col items-start gap-1">
          {product.discountPercent ? (
            <span className="bg-destructive px-2 py-1 text-[10px] font-semibold tracking-wider text-white uppercase">
              {t("product.off", { percent: product.discountPercent })}
            </span>
          ) : null}
          {product.condition ? (
            <span className="bg-brand px-2 py-1 text-[10px] font-semibold tracking-wider text-white uppercase" data-testid="preloved-badge">
              {t("conditions.preLoved")}
            </span>
          ) : (
            product.isNew && <span className="bg-white px-2 py-1 text-[10px] font-semibold tracking-wider uppercase">{t("product.new")}</span>
          )}
          {!product.inStock && (
            <span className="bg-foreground px-2 py-1 text-[10px] font-semibold tracking-wider text-white uppercase">{t("product.soldOut")}</span>
          )}
        </div>

        <WishlistButton productId={product.id} className="absolute top-2 right-2" />

        <button
          type="button"
          onClick={() => setQuickView(true)}
          className="absolute inset-x-3 bottom-3 hidden translate-y-2 items-center justify-center gap-2 bg-white/95 py-2.5 text-[11px] font-semibold tracking-[0.14em] uppercase opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 md:flex"
          aria-label={`${t("product.quickView")}: ${product.name}`}
        >
          <Eye className="size-3.5" aria-hidden />
          {t("product.quickView")}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1 pt-3">
        <h3 className="line-clamp-1 text-[13px] leading-snug sm:text-sm">
          <Link href={`/products/${product.slug}`} className="underline-offset-4 hover:underline">
            {product.name}
          </Link>
        </h3>
        <Price cents={product.priceCents} compareAtCents={product.compareAtCents} size="sm" />
        {product.colors.length > 1 && (
          <div className="mt-1 flex items-center gap-1.5" aria-label={t("product.colorsAvailable", { count: product.colors.length })}>
            {product.colors.slice(0, 5).map((c) => (
              <span key={c.id} title={c.label ?? c.name} className="size-3 rounded-full border border-black/15" style={{ backgroundColor: c.hex }} />
            ))}
            {product.colors.length > 5 && <span className="text-[11px] text-muted-foreground">+{product.colors.length - 5}</span>}
          </div>
        )}
      </div>

      {quickView && <QuickViewDialog slug={product.slug} open={quickView} onOpenChange={setQuickView} />}
    </article>
  );
}

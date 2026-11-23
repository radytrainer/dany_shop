"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductPurchasePanel } from "./product-purchase-panel";
import { api } from "@/lib/fetcher";
import { useI18n } from "@/i18n/client";
import type { ProductDetailDTO } from "@/types/catalog";

export function QuickViewDialog({
  slug,
  open,
  onOpenChange,
  onAdded,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdded?: () => void;
}) {
  const { t } = useI18n();
  const [product, setProduct] = useState<ProductDetailDTO | null>(null);
  const [error, setError] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<ProductDetailDTO>(`/api/products/${encodeURIComponent(slug)}`)
      .then((p) => !cancelled && setProduct(p))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const image = product?.images[imageIndex] ?? product?.images[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-sm p-0 sm:max-w-4xl">
        <DialogTitle className="sr-only">{product?.name ?? t("product.quickView")}</DialogTitle>
        {error ? (
          <p className="p-10 text-center text-sm text-muted-foreground">{t("common.somethingWrongBody")}</p>
        ) : !product ? (
          <div className="grid gap-6 p-6 md:grid-cols-2">
            <Skeleton className="aspect-[3/4] w-full rounded-none" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2">
            <div className="relative aspect-[3/4] bg-secondary">
              {image && <Image src={image.url} alt={image.alt ?? product.name} fill sizes="(min-width: 768px) 448px, 100vw" className="object-cover" />}
              {product.images.length > 1 && (
                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                  {product.images.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setImageIndex(i)}
                      aria-label={`${i + 1}`}
                      className={`h-1 w-6 transition-colors ${i === imageIndex ? "bg-foreground" : "bg-white/70"}`}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4 p-6">
              <ProductPurchasePanel
                product={product}
                compact
                onAdded={() => {
                  onAdded?.();
                  onOpenChange(false);
                }}
                onColorChange={(colorId) => {
                  const idx = product.images.findIndex((i) => i.colorId === colorId);
                  if (idx >= 0) setImageIndex(idx);
                }}
              />
              <Link href={`/products/${product.slug}`} className="text-xs underline underline-offset-4" onClick={() => onOpenChange(false)}>
                {t("product.viewDetails")}
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

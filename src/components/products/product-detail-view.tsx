"use client";

import { useState } from "react";
import { ProductGallery } from "./product-gallery";
import { ProductPurchasePanel } from "./product-purchase-panel";
import type { ProductDetailDTO } from "@/types/catalog";

/** Gallery + purchase panel; selecting a colour jumps the gallery to that colour's image. */
export function ProductDetailView({ product, children }: { product: ProductDetailDTO; children?: React.ReactNode }) {
  const [imageIndex, setImageIndex] = useState(0);
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
      <ProductGallery images={product.images} name={product.name} activeIndex={imageIndex} onChange={setImageIndex} />
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ProductPurchasePanel
          product={product}
          stickyMobileBar
          onColorChange={(colorId) => {
            const idx = product.images.findIndex((i) => i.colorId === colorId);
            if (idx >= 0) setImageIndex(idx);
          }}
        />
        {children}
      </div>
    </div>
  );
}

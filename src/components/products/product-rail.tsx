"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./product-card";
import { useI18n } from "@/i18n/client";
import type { ProductCardDTO } from "@/types/catalog";

/** Horizontal, snap-scrolling product carousel (intentional horizontal scroll). */
export function ProductRail({ products, label }: { products: ProductCardDTO[]; label: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const { t } = useI18n();
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <div className="relative">
      <ul
        ref={ref}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 sm:-mx-6 sm:gap-5 sm:px-6 lg:mx-0 lg:px-0"
        aria-label={label}
      >
        {products.map((p, i) => (
          <li key={p.id} className="w-[44vw] shrink-0 snap-start sm:w-[30vw] md:w-[23vw] lg:w-[calc((100%-60px)/4)]">
            <ProductCard product={p} priority={i < 2} sizes="(min-width: 1024px) 24vw, (min-width: 640px) 30vw, 44vw" />
          </li>
        ))}
      </ul>
      {products.length > 4 && (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] hidden justify-between lg:flex">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="pointer-events-auto -ml-5 flex size-10 items-center justify-center rounded-full border bg-background shadow-sm hover:border-foreground"
            aria-label={t("common.previous")}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            className="pointer-events-auto -mr-5 flex size-10 items-center justify-center rounded-full border bg-background shadow-sm hover:border-foreground"
            aria-label={t("common.next")}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { useI18n } from "@/i18n/client";
import { ProductRail } from "./product-rail";
import { SectionHeading } from "@/components/shared/section-heading";
import type { ProductCardDTO } from "@/types/catalog";

const KEY = "ds_recently_viewed";

/** Records the current product and shows the others the shopper viewed recently. */
export function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const { t } = useI18n();
  const [items, setItems] = useState<ProductCardDTO[]>([]);

  useEffect(() => {
    let list: string[] = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      if (Array.isArray(parsed)) list = parsed.filter((s) => typeof s === "string");
    } catch {
      /* ignore */
    }
    const others = list.filter((s) => s !== currentSlug).slice(0, 10);
    localStorage.setItem(KEY, JSON.stringify([currentSlug, ...others].slice(0, 12)));
    if (others.length === 0) return;
    api<ProductCardDTO[]>(`/api/products/cards?slugs=${others.map(encodeURIComponent).join(",")}`)
      .then(setItems)
      .catch(() => undefined);
  }, [currentSlug]);

  if (items.length === 0) return null;
  return (
    <section className="container-page py-12">
      <SectionHeading title={t("product.recentlyViewed")} />
      <ProductRail products={items} label={t("product.recentlyViewed")} />
    </section>
  );
}

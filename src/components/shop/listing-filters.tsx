"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, SlidersHorizontal, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/client";
import { useMoney } from "@/features/store/store-provider";
import { cn } from "@/lib/utils";
import { useQueryState } from "./use-query-state";
import type { ListingFacets, SortKey } from "@/types/catalog";
import type { MessageKey } from "@/i18n/translator";

export type CategoryFacet = { slug: string; name: string; active: boolean; depth: number };

const SORT_LABELS: Record<SortKey, MessageKey> = {
  newest: "shop.sortNewest",
  price_asc: "shop.sortPriceAsc",
  price_desc: "shop.sortPriceDesc",
  popular: "shop.sortPopular",
  best: "shop.sortBestSelling",
};

export function SortSelect({ className }: { className?: string }) {
  const { t } = useI18n();
  const { params, update } = useQueryState();
  const value = (params.get("sort") as SortKey) || "newest";
  return (
    <Select value={value} onValueChange={(v) => update({ sort: v === "newest" ? null : v })}>
      <SelectTrigger className={cn("h-10 w-auto min-w-44 rounded-sm text-xs", className)} aria-label={t("shop.sortBy")}>
        <span className="text-muted-foreground">{t("shop.sortBy")}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
          <SelectItem key={k} value={k}>
            {t(SORT_LABELS[k])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PriceRange({ facets }: { facets: ListingFacets }) {
  const { t } = useI18n();
  const { params, update } = useQueryState();
  const [min, setMin] = useState(params.get("minPrice") ?? "");
  const [max, setMax] = useState(params.get("maxPrice") ?? "");
  const valid = (v: string) => v === "" || /^\d{1,7}(\.\d{1,2})?$/.test(v);
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid(min) && valid(max)) update({ minPrice: min || null, maxPrice: max || null });
      }}
    >
      <label className="flex-1 text-xs text-muted-foreground">
        {t("shop.minPrice")}
        <input
          inputMode="decimal"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          placeholder={String(facets.priceMin)}
          className="mt-1 h-10 w-full border px-2 text-sm text-foreground outline-none focus:border-foreground"
        />
      </label>
      <label className="flex-1 text-xs text-muted-foreground">
        {t("shop.maxPrice")}
        <input
          inputMode="decimal"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          placeholder={String(facets.priceMax)}
          className="mt-1 h-10 w-full border px-2 text-sm text-foreground outline-none focus:border-foreground"
        />
      </label>
      <Button type="submit" variant="outline" className="h-10 rounded-sm px-3 text-xs">
        {t("common.apply")}
      </Button>
    </form>
  );
}

function CheckRow({ label, checked, onChange, swatch }: { label: string; checked: boolean; onChange: () => void; swatch?: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={onChange} className="flex w-full items-center gap-3 py-1.5 text-left text-sm">
      <span className={cn("flex size-4 shrink-0 items-center justify-center border", checked ? "border-foreground bg-foreground text-background" : "border-foreground/40")}>
        {checked && <Check className="size-3" />}
      </span>
      {swatch && <span className="size-4 rounded-full border border-black/15" style={{ backgroundColor: swatch }} />}
      <span>{label}</span>
    </button>
  );
}

function FilterPanel({ facets, categories }: { facets: ListingFacets; categories: CategoryFacet[] }) {
  const { t } = useI18n();
  const { getList, toggleInList, params, update } = useQueryState();
  const sizes = getList("sizes");
  const colors = getList("colors");
  const brands = getList("brands");
  const flag = (k: string) => params.get(k) === "1";
  const { format } = useMoney();

  return (
    <Accordion type="multiple" defaultValue={["category", "size", "color", "price", "availability"]} className="w-full">
      {categories.length > 0 && (
        <AccordionItem value="category">
          <AccordionTrigger className="text-xs font-semibold tracking-wider uppercase">{t("shop.category")}</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-1.5">
              {categories.map((c) => (
                <li key={c.slug} style={{ paddingLeft: c.depth * 12 }}>
                  <Link
                    href={`/categories/${c.slug}`}
                    className={cn("text-sm hover:underline", c.active ? "font-semibold underline underline-offset-4" : "text-muted-foreground")}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      )}
      {facets.sizes.length > 0 && (
        <AccordionItem value="size">
          <AccordionTrigger className="text-xs font-semibold tracking-wider uppercase">
            {t("shop.size")} {sizes.length > 0 && `(${sizes.length})`}
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-4 gap-1.5">
              {facets.sizes.map((s) => {
                const on = sizes.includes(s.name);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleInList("sizes", s.name)}
                    className={cn("h-9 border text-xs", on ? "border-foreground bg-foreground text-background" : "hover:border-foreground")}
                  >
                    {s.label ?? s.name}
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}
      {facets.colors.length > 0 && (
        <AccordionItem value="color">
          <AccordionTrigger className="text-xs font-semibold tracking-wider uppercase">
            {t("shop.color")} {colors.length > 0 && `(${colors.length})`}
          </AccordionTrigger>
          <AccordionContent>
            {facets.colors.map((c) => (
              <CheckRow key={c.id} label={c.label ?? c.name} swatch={c.hex} checked={colors.includes(c.name)} onChange={() => toggleInList("colors", c.name)} />
            ))}
          </AccordionContent>
        </AccordionItem>
      )}
      <AccordionItem value="price">
        <AccordionTrigger className="text-xs font-semibold tracking-wider uppercase">{t("shop.price")}</AccordionTrigger>
        <AccordionContent>
          <p className="mb-2 text-xs text-muted-foreground">
            {format(facets.priceMin * 100)} – {format(facets.priceMax * 100)}
          </p>
          {/* Remount when the URL changes so the inputs reflect the active filter. */}
          <PriceRange key={`${params.get("minPrice") ?? ""}-${params.get("maxPrice") ?? ""}`} facets={facets} />
        </AccordionContent>
      </AccordionItem>
      {facets.brands.length > 1 && (
        <AccordionItem value="brand">
          <AccordionTrigger className="text-xs font-semibold tracking-wider uppercase">{t("shop.brand")}</AccordionTrigger>
          <AccordionContent>
            {facets.brands.map((b) => (
              <CheckRow key={b} label={b} checked={brands.includes(b)} onChange={() => toggleInList("brands", b)} />
            ))}
          </AccordionContent>
        </AccordionItem>
      )}
      <AccordionItem value="availability">
        <AccordionTrigger className="text-xs font-semibold tracking-wider uppercase">{t("shop.availability")}</AccordionTrigger>
        <AccordionContent>
          <CheckRow label={t("shop.inStockOnly")} checked={flag("inStock")} onChange={() => update({ inStock: flag("inStock") ? null : "1" })} />
          <CheckRow label={t("shop.onSale")} checked={flag("sale")} onChange={() => update({ sale: flag("sale") ? null : "1" })} />
          <CheckRow label={t("shop.newArrivals")} checked={flag("new")} onChange={() => update({ new: flag("new") ? null : "1" })} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

const FILTER_KEYS = ["sizes", "colors", "brands", "minPrice", "maxPrice", "inStock", "sale", "new"];

export function ActiveFilters({ facets }: { facets?: ListingFacets }) {
  const { t } = useI18n();
  const display = (key: string, v: string) =>
    (key === "sizes" ? facets?.sizes : key === "colors" ? facets?.colors : undefined)?.find((o) => o.name === v)?.label ?? v;
  const { params, getList, update } = useQueryState();
  const chips: { label: string; onRemove: () => void }[] = [];
  for (const key of ["sizes", "colors", "brands"]) {
    for (const v of getList(key)) chips.push({ label: display(key, v), onRemove: () => update({ [key]: getList(key).filter((x) => x !== v) }) });
  }
  if (params.get("minPrice") || params.get("maxPrice"))
    chips.push({
      label: `${t("shop.price")}: ${params.get("minPrice") ?? "0"}–${params.get("maxPrice") ?? "∞"}`,
      onRemove: () => update({ minPrice: null, maxPrice: null }),
    });
  if (params.get("inStock") === "1") chips.push({ label: t("shop.inStockOnly"), onRemove: () => update({ inStock: null }) });
  if (params.get("sale") === "1") chips.push({ label: t("shop.onSale"), onRemove: () => update({ sale: null }) });
  if (params.get("new") === "1") chips.push({ label: t("shop.newArrivals"), onRemove: () => update({ new: null }) });
  if (chips.length === 0) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button key={c.label} type="button" onClick={c.onRemove} className="inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs hover:border-foreground">
          {c.label}
          <X className="size-3" aria-hidden />
        </button>
      ))}
      <button type="button" className="text-xs underline underline-offset-4" onClick={() => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])))}>
        {t("common.clearAll")}
      </button>
    </div>
  );
}

export function FilterSidebar({ facets, categories }: { facets: ListingFacets; categories: CategoryFacet[] }) {
  const { t } = useI18n();
  return (
    <aside className="hidden w-60 shrink-0 lg:block" aria-label={t("a11y.filters")}>
      <div className="sticky top-24">
        <FilterPanel facets={facets} categories={categories} />
      </div>
    </aside>
  );
}

export function MobileFilterSheet({ facets, categories, total }: { facets: ListingFacets; categories: CategoryFacet[]; total: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { params, update, pending } = useQueryState();
  const activeCount = FILTER_KEYS.filter((k) => params.get(k)).length;
  return (
    <>
      <Button variant="outline" className="h-10 rounded-sm text-xs lg:hidden" onClick={() => setOpen(true)} data-testid="open-filters">
        <SlidersHorizontal className="size-4" />
        {t("shop.filterAndSort")}
        {activeCount > 0 && <span className="ml-1 rounded-full bg-foreground px-1.5 text-[10px] text-background">{activeCount}</span>}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="flex max-h-[88dvh] flex-col gap-0 rounded-t-xl p-0">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle className="font-heading text-xl font-normal">{t("shop.filterAndSort")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-2">
            <div className="border-b py-4">
              <p className="mb-2 text-xs font-semibold tracking-wider uppercase">{t("shop.sortBy")}</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => {
                  const on = (params.get("sort") || "newest") === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => update({ sort: k === "newest" ? null : k })}
                      className={cn("border px-3 py-2 text-xs", on ? "border-foreground bg-foreground text-background" : "")}
                    >
                      {t(SORT_LABELS[k])}
                    </button>
                  );
                })}
              </div>
            </div>
            <FilterPanel facets={facets} categories={categories} />
          </div>
          <SheetFooter className="grid grid-cols-2 gap-2 border-t px-5 py-4 pb-safe">
            <Button variant="outline" size="xl" onClick={() => update(Object.fromEntries([...FILTER_KEYS, "sort"].map((k) => [k, null])))}>
              {t("shop.resetFilters")}
            </Button>
            <Button size="xl" onClick={() => setOpen(false)} disabled={pending}>
              {t("shop.showResults", { count: total })}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

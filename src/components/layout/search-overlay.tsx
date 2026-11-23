"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Clock, Loader2, Search, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Price } from "@/components/shared/price";
import { api } from "@/lib/fetcher";
import { useI18n } from "@/i18n/client";
import type { ProductCardDTO } from "@/types/catalog";
import { createLocalStore } from "@/lib/local-store";

type Suggestions = { products: ProductCardDTO[]; total: number; categories: { slug: string; name: string; parent: string | null }[] };

const NO_RECENT: string[] = [];
const recentStore = createLocalStore<string[]>(
  "ds_recent_searches",
  (raw) => (Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, 6) : NO_RECENT),
  NO_RECENT,
);

export function pushRecentSearch(q: string) {
  recentStore.set((prev) => [q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6));
}


export function SearchOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [result, setResult] = useState<{ term: string; data: Suggestions | null } | null>(null);
  const recent = useSyncExternalStore(recentStore.subscribe, recentStore.get, recentStore.getServer);
  const term = q.trim();
  const active = term.length >= 2;
  const data = active && result?.term === term ? result.data : null;
  const loading = active && result?.term !== term;

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [open]);

  // Debounced suggestions (results are keyed by the term they belong to).
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api<Suggestions>(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((d) => setResult({ term, data: d }))
        .catch((e) => {
          if (!controller.signal.aborted) setResult({ term, data: { products: [], total: 0, categories: [] } });
          return e;
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, active]);

  function submit(term: string) {
    const value = term.trim();
    if (!value) return;
    pushRecentSearch(value);
    onOpenChange(false);
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="h-dvh max-h-dvh gap-0 overflow-y-auto p-0 sm:h-auto sm:max-h-[85dvh] [&>button:last-child]:hidden">
        <SheetTitle className="sr-only">{t("search.title")}</SheetTitle>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            submit(q);
          }}
          className="container-page flex items-center gap-3 border-b py-3 sm:py-5"
        >
          <Search className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-xl"
            aria-label={t("search.placeholder")}
            enterKeyHint="search"
            maxLength={100}
            data-testid="search-input"
          />
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />}
          <button type="button" onClick={() => onOpenChange(false)} className="p-2" aria-label={t("common.close")}>
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </form>

        <div className="container-page py-6">
          {!data && (
            <div className="grid gap-8 sm:grid-cols-2">
              {recent.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="eyebrow">{t("search.recent")}</p>
                    <button
                      type="button"
                      className="text-xs underline underline-offset-4"
                      onClick={() => recentStore.set(() => NO_RECENT)}
                    >
                      {t("search.clearRecent")}
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {recent.map((r) => (
                      <li key={r}>
                        <button type="button" onClick={() => submit(r)} className="flex items-center gap-2 py-1.5 text-sm hover:underline">
                          <Clock className="size-3.5 text-muted-foreground" aria-hidden />
                          {r}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="eyebrow mb-3">{t("search.popular")}</p>
                <div className="flex flex-wrap gap-2">
                  {t("search.popularTerms").split("|").map((p) => (
                    <button key={p} type="button" onClick={() => submit(p)} className="border px-3 py-1.5 text-sm hover:border-foreground">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {data && (
            <div className="grid gap-8 md:grid-cols-[220px_1fr]">
              <div>
                <p className="eyebrow mb-3">{t("search.categories")}</p>
                {data.categories.length ? (
                  <ul className="space-y-2">
                    {data.categories.map((c) => (
                      <li key={c.slug}>
                        <Link href={`/categories/${c.slug}`} onClick={() => onOpenChange(false)} className="text-sm hover:underline">
                          {c.parent ? <span className="text-muted-foreground">{c.parent} / </span> : null}
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
              <div>
                <p className="eyebrow mb-3">{t("search.products")}</p>
                {data.products.length === 0 ? (
                  <div className="py-6">
                    <p className="font-heading text-xl">{t("search.noResults", { query: q.trim() })}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t("search.noResultsBody")}</p>
                  </div>
                ) : (
                  <>
                    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                      {data.products.map((p) => (
                        <li key={p.id}>
                          <Link href={`/products/${p.slug}`} onClick={() => onOpenChange(false)} className="group block">
                            <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
                              {p.imageUrl && (
                                <Image src={p.imageUrl} alt={p.name} fill sizes="160px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                              )}
                            </div>
                            <p className="mt-2 line-clamp-1 text-xs">{p.name}</p>
                            <Price cents={p.priceCents} compareAtCents={p.compareAtCents} size="sm" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <button type="button" onClick={() => submit(q)} className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] uppercase hover:underline">
                      {t("search.viewAllResults")} ({data.total})
                      <ArrowRight className="size-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

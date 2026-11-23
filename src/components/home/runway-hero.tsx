"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from "framer-motion";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { Price } from "@/components/shared/price";
import { WishlistButton } from "@/components/products/wishlist-button";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { BannerDTO } from "@/services/content";
import type { ProductCardDTO } from "@/types/catalog";

const QuickViewDialog = dynamic(() => import("@/components/products/quick-view-dialog").then((m) => m.QuickViewDialog), { ssr: false });

const EASE = [0.22, 1, 0.36, 1] as const;
const AUTOPLAY_MS = 6000;

/**
 * Runway positions. The front look is sharp; upcoming looks wait behind it, receding to the
 * left with depth-of-field blur. On advance the front look walks out to the right.
 */
type Slot = "front" | "b1" | "b2" | "b3" | "hidden" | "exit";
const SLOTS: Record<Slot, TargetAndTransition & { zIndex: number }> = {
  front: { x: "0%", scale: 1, opacity: 1, filter: "blur(0px)", zIndex: 50 },
  b1: { x: "-56%", scale: 0.8, opacity: 0.9, filter: "blur(1.5px)", zIndex: 40 },
  b2: { x: "-98%", scale: 0.64, opacity: 0.6, filter: "blur(4px)", zIndex: 30 },
  b3: { x: "-130%", scale: 0.52, opacity: 0.25, filter: "blur(7px)", zIndex: 20 },
  hidden: { x: "-150%", scale: 0.44, opacity: 0, filter: "blur(10px)", zIndex: 10 },
  exit: { x: "60%", scale: 1.06, opacity: 0, filter: "blur(2px)", zIndex: 60 },
};

function slotFor(index: number, active: number, count: number): Slot {
  const d = (index - active + count) % count;
  if (d === 0) return "front";
  if (count > 2 && d === count - 1) return "exit";
  return (["b1", "b2", "b3"] as const)[d - 1] ?? "hidden";
}

const pad = (n: number) => String(n).padStart(2, "0");

export function RunwayHero({ banner, looks, fallbackTitle, fallbackText }: { banner: BannerDTO | null; looks: ProductCardDTO[]; fallbackTitle: string; fallbackText: string | null }) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [quickView, setQuickView] = useState<string | null>(null);
  const stripRef = useRef<HTMLOListElement>(null);
  const count = looks.length;
  const current = looks[active];

  const go = useCallback((dir: 1 | -1) => setActive((a) => (a + dir + count) % count), [count]);

  // Autoplay (paused on hover/focus, when a dialog is open, or for reduced motion).
  useEffect(() => {
    if (count < 2 || paused || reduce || quickView) return;
    const id = setTimeout(() => go(1), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [active, count, paused, reduce, quickView, go]);

  // Keep the active look visible in the side strip (desktop).
  useEffect(() => {
    const list = stripRef.current;
    const item = list?.querySelector<HTMLElement>(`[data-look="${active}"]`);
    if (!list || !item) return;
    list.scrollTo({ top: item.offsetTop - list.clientHeight / 2 + item.clientHeight / 2, behavior: reduce ? "auto" : "smooth" });
  }, [active, reduce]);

  const title = banner?.title ?? fallbackTitle;
  const eyebrow = banner?.subtitle ?? null;
  const description = banner?.description ?? fallbackText;

  return (
    <section
      className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#f3f2ee_0%,#fafaf8_55%,#ffffff_100%)]"
      aria-roledescription="carousel"
      aria-label={t("home.theLooks")}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <div className="mx-auto grid max-w-[1600px] grid-cols-[minmax(0,1fr)] lg:h-[calc(100svh-108px)] lg:max-h-[900px] lg:min-h-[640px] lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ── Stage ─────────────────────────────────────────── */}
        <div
          className="relative flex flex-col px-4 pt-8 sm:px-6 lg:px-10 lg:pt-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          {/* Campaign copy */}
          <motion.div
            className="relative z-[70] max-w-md"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            {eyebrow && <p className="mb-3 text-[10px] font-semibold tracking-[0.32em] text-muted-foreground uppercase">{eyebrow}</p>}
            <h1 className="text-[26px] leading-[1.15] font-light tracking-[0.12em] uppercase sm:text-4xl sm:tracking-[0.16em] lg:text-[44px] lg:tracking-[0.18em]">{title}</h1>
            {description && <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
            {(banner?.ctaHref || banner?.secondaryCtaHref) && (
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-semibold tracking-[0.2em] uppercase">
                {banner?.ctaLabel && banner.ctaHref && (
                  <Link href={banner.ctaHref} className="group inline-flex items-center gap-2 border-b border-foreground pb-1">
                    {banner.ctaLabel}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                  </Link>
                )}
                {banner?.secondaryCtaLabel && banner.secondaryCtaHref && (
                  <Link href={banner.secondaryCtaHref} className="inline-flex items-center border-b border-transparent pb-1 text-muted-foreground hover:border-foreground hover:text-foreground">
                    {banner.secondaryCtaLabel}
                  </Link>
                )}
              </div>
            )}
          </motion.div>

          {/* Runway */}
          {count > 0 && (
            <motion.div
              className="relative mt-4 h-[56svh] min-h-[360px] flex-1 touch-pan-y lg:absolute lg:inset-0 lg:mt-0 lg:h-auto"
              drag={count > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) go(1);
                else if (info.offset.x > 60) go(-1);
              }}
            >
              {/* Floor glow */}
              <div className="pointer-events-none absolute bottom-[6%] left-[62%] h-10 w-[40%] -translate-x-1/2 rounded-[100%] bg-black/10 blur-2xl lg:bottom-[7%] lg:left-[68%] lg:w-[24%]" aria-hidden />
              {looks.map((look, i) => {
                const slot = slotFor(i, active, count);
                const { zIndex, ...target } = SLOTS[slot];
                const isFront = slot === "front";
                return (
                  <div
                    key={look.id}
                    className="absolute bottom-[6%] left-[62%] aspect-[3/4] w-[50vw] max-w-[320px] -translate-x-1/2 sm:w-[36vw] lg:bottom-[9%] lg:left-[68%] lg:w-[clamp(240px,23vw,370px)] lg:max-w-none"
                    style={{ zIndex }}
                    aria-hidden={!isFront}
                  >
                  <motion.div
                    className="h-full w-full origin-bottom"
                    initial={false}
                    animate={target}
                    transition={reduce ? { duration: 0 } : { duration: 1.1, ease: EASE }}
                  >
                    {isFront ? (
                      <Link href={`/products/${look.slug}`} className="group block h-full w-full" draggable={false} aria-label={look.name}>
                        <LookImage look={look} priority />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setActive(i)}
                        className="block h-full w-full cursor-pointer"
                        aria-label={t("home.viewLook", { number: i + 1 })}
                      >
                        {/* Fully hidden looks (opacity 0) load their image only when they move into view. */}
                        {slot === "hidden" ? <div className="h-full w-full" /> : <LookImage look={look} />}
                      </button>
                    )}
                  </motion.div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Counter + controls */}
          {current && (
            <div className="relative z-[70] mt-auto flex items-end justify-between gap-4 pt-4 pb-6 lg:pb-10">
              <div className="pointer-events-none absolute -left-10 -top-20 -bottom-6 -z-10 hidden w-[520px] bg-[radial-gradient(ellipse_at_bottom_left,#fafaf8_35%,rgba(250,250,248,0.75)_55%,transparent_75%)] lg:block" aria-hidden />
              <div>
                <p className="flex items-baseline gap-3 font-light uppercase" aria-live="polite">
                  <span className="text-2xl tracking-[0.24em] sm:text-3xl">{t("home.look")}</span>
                  <span className="relative inline-flex h-[1.2em] overflow-hidden text-2xl tabular-nums sm:text-3xl">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={active}
                        initial={reduce ? false : { y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={reduce ? undefined : { y: "-100%", opacity: 0 }}
                        transition={{ duration: 0.5, ease: EASE }}
                      >
                        {pad(active + 1)}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <span className="text-xs tracking-[0.2em] text-muted-foreground">/ {pad(count)}</span>
                </p>
                <div className="mt-2 flex items-center gap-4">
                  <Link href={`/products/${current.slug}`} className="text-[11px] font-semibold tracking-[0.2em] uppercase underline underline-offset-4">
                    {t("home.shopTheLook")}
                  </Link>
                  <span className="hidden max-w-[220px] truncate text-xs text-muted-foreground sm:inline">{current.name}</span>
                </div>
                {count > 1 && (
                  <div className="mt-3 h-px w-40 overflow-hidden bg-foreground/10">
                    <motion.div
                      key={`${active}-${paused}`}
                      className="h-full bg-foreground"
                      initial={{ width: paused || reduce ? "100%" : "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: paused || reduce ? 0 : AUTOPLAY_MS / 1000, ease: "linear" }}
                    />
                  </div>
                )}
              </div>
              {count > 1 && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => go(-1)} aria-label={t("home.prevLook")} className="flex size-11 items-center justify-center rounded-full border border-foreground/15 bg-white/70 backdrop-blur hover:border-foreground">
                    <ArrowLeft className="size-4" />
                  </button>
                  <button type="button" onClick={() => go(1)} aria-label={t("home.nextLook")} className="flex size-11 items-center justify-center rounded-full border border-foreground/15 bg-white/70 backdrop-blur hover:border-foreground">
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Looks strip ───────────────────────────────────── */}
        {count > 0 && (
          <aside className="border-t border-foreground/10 lg:flex lg:min-h-0 lg:flex-col lg:border-t-0 lg:border-l" aria-label={t("home.theLooks")}>
            <p className="hidden px-5 pt-6 pb-3 text-[10px] font-semibold tracking-[0.3em] text-muted-foreground uppercase lg:block">
              {t("home.theLooks")} · {pad(count)}
            </p>
            <ol ref={stripRef} className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4 py-4 sm:px-6 lg:min-h-0 lg:flex-1 lg:snap-y lg:flex-col lg:gap-0 lg:overflow-x-visible lg:overflow-y-auto lg:px-0 lg:py-0">
              {looks.map((look, i) => {
                const isActive = i === active;
                return (
                  <li key={look.id} data-look={i} className="w-[30vw] max-w-[170px] shrink-0 snap-start sm:w-[22vw] lg:w-auto lg:max-w-none">
                    <div className={cn("group relative transition-colors lg:border-b lg:border-foreground/10 lg:px-5 lg:py-4", isActive ? "lg:bg-white" : "lg:hover:bg-white/60")}>
                      <div className="mb-2 hidden items-start justify-between gap-2 lg:flex">
                        <button type="button" onClick={() => setActive(i)} className="min-w-0 text-left" aria-current={isActive}>
                          <span className="block truncate text-[10px] font-semibold tracking-[0.18em] uppercase">{look.name}</span>
                          <Price cents={look.priceCents} compareAtCents={look.compareAtCents} size="sm" className="text-muted-foreground" />
                        </button>
                        <button type="button" onClick={() => setQuickView(look.slug)} aria-label={`${t("product.quickView")}: ${look.name}`} className="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-secondary">
                          <Plus className="size-4" strokeWidth={1.5} />
                        </button>
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActive(i)}
                          aria-label={t("home.viewLook", { number: i + 1 })}
                          aria-current={isActive}
                          className={cn("relative block aspect-[3/4] w-full overflow-hidden bg-secondary transition-opacity lg:aspect-[4/5]", isActive ? "opacity-100" : "opacity-70 hover:opacity-100")}
                        >
                          {look.imageUrl && <Image src={look.imageUrl} alt="" fill sizes="(min-width: 1024px) 260px, 38vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />}
                          {isActive && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground" aria-hidden />}
                        </button>
                        <WishlistButton productId={look.id} className="absolute top-2 right-2 size-8" />
                      </div>
                      {/* Mobile caption */}
                      <div className="mt-2 lg:hidden">
                        <p className="truncate text-[10px] font-semibold tracking-[0.16em] uppercase">{look.name}</p>
                        <Price cents={look.priceCents} compareAtCents={look.compareAtCents} size="sm" />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>
        )}
      </div>

      {quickView && <QuickViewDialog slug={quickView} open onOpenChange={(o) => !o && setQuickView(null)} />}
    </section>
  );
}

function LookImage({ look, priority = false }: { look: ProductCardDTO; priority?: boolean }) {
  if (!look.imageUrl) return <div className="h-full w-full bg-secondary" />;
  return (
    <div className="relative h-full w-full overflow-hidden shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)]">
      <Image src={look.imageUrl} alt={look.name} fill priority={priority} draggable={false} sizes="(min-width: 1024px) 26vw, 54vw" quality={85} className="object-cover transition-transform duration-1000 group-hover:scale-[1.03]" />
    </div>
  );
}

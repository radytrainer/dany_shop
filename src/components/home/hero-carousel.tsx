"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { BannerDTO } from "@/services/content";
import { useI18n } from "@/i18n/client";

const EASE = [0.22, 1, 0.36, 1] as const;

export function HeroCarousel({ banners }: { banners: BannerDTO[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const { t } = useI18n();
  const count = banners.length;
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused || reduce) return;
    const timer = setInterval(next, 7000);
    return () => clearInterval(timer);
  }, [count, paused, reduce, next]);

  const b = banners[index];
  return (
    <section
      className="relative h-[calc(100svh-56px-36px)] max-h-[860px] min-h-[520px] overflow-hidden bg-secondary lg:h-[calc(100svh-72px-36px)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={t("a11y.featured")}
    >
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={b.id}
          className="absolute inset-0"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: EASE }}
        >
          <picture>
            {b.mobileImageUrl && <source media="(max-width: 767px)" srcSet={b.mobileImageUrl} />}
            <Image src={b.imageUrl} alt="" fill priority={index === 0} sizes="100vw" quality={85} className="object-cover object-[center_25%]" />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent md:bg-gradient-to-r md:from-black/45 md:via-black/10" />
        </motion.div>
      </AnimatePresence>

      <div className="container-page relative flex h-full flex-col justify-end pb-14 text-white md:justify-center md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div key={b.id} className="max-w-xl" initial="hidden" animate="show" exit="exit">
            {b.subtitle && (
              <motion.p
                className="mb-4 text-[11px] font-semibold tracking-[0.3em] uppercase"
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 }, exit: { opacity: 0 } }}
                transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
              >
                {b.subtitle}
              </motion.p>
            )}
            <motion.h1
              className="font-heading text-[44px] leading-[1.02] sm:text-6xl lg:text-7xl"
              variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } }}
              transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            >
              {b.title}
            </motion.h1>
            {b.description && (
              <motion.p
                className="mt-5 max-w-md text-sm leading-relaxed text-white/85 sm:text-base"
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 }, exit: { opacity: 0 } }}
                transition={{ duration: 0.7, delay: 0.45, ease: EASE }}
              >
                {b.description}
              </motion.p>
            )}
            <motion.div
              className="mt-8 flex flex-col gap-3 sm:flex-row"
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 }, exit: { opacity: 0 } }}
              transition={{ duration: 0.6, delay: 0.6, ease: EASE }}
            >
              {b.ctaLabel && b.ctaHref && (
                <Button asChild size="xl" className="bg-white text-foreground hover:bg-white/90">
                  <Link href={b.ctaHref}>{b.ctaLabel}</Link>
                </Button>
              )}
              {b.secondaryCtaLabel && b.secondaryCtaHref && (
                <Button asChild size="xl" variant="outline" className="border-white bg-transparent text-white hover:bg-white hover:text-foreground">
                  <Link href={b.secondaryCtaHref}>{b.secondaryCtaLabel}</Link>
                </Button>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2 md:right-10 md:left-auto md:justify-end">
          {banners.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={t("a11y.slide", { number: i + 1 })}
              aria-current={i === index}
              className="relative h-[3px] w-10 overflow-hidden bg-white/40"
            >
              {i === index && (
                <motion.span
                  className="absolute inset-y-0 left-0 bg-white"
                  initial={{ width: reduce || paused ? "100%" : "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: reduce || paused ? 0 : 7, ease: "linear" }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

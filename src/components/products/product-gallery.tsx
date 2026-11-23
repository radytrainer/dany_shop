"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImageOff, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ProductImageDTO } from "@/types/catalog";

export function ProductGallery({ images, name, activeIndex, onChange }: { images: ProductImageDTO[]; name: string; activeIndex: number; onChange: (i: number) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);

  // Keep the mobile swipe track in sync when the index changes externally (e.g. colour selection).
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const target = activeIndex * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) > 4) el.scrollTo({ left: target, behavior: "smooth" });
  }, [activeIndex]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center bg-secondary text-muted-foreground">
        <ImageOff className="size-8" strokeWidth={1.2} />
      </div>
    );
  }
  const active = images[activeIndex] ?? images[0];

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row">
      {/* Thumbnails (desktop) */}
      {images.length > 1 && (
        <div className="hidden w-20 shrink-0 flex-col gap-2 lg:flex">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onChange(i)}
              aria-label={`${name} ${i + 1}`}
              aria-current={i === activeIndex}
              className={cn("relative aspect-[3/4] overflow-hidden bg-secondary transition-opacity", i === activeIndex ? "ring-1 ring-foreground" : "opacity-60 hover:opacity-100")}
            >
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Mobile: swipeable track */}
      <div className="relative -mx-4 sm:-mx-6 lg:hidden">
        <div
          ref={scroller}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== activeIndex) onChange(i);
          }}
        >
          {images.map((img, i) => (
            <div key={img.id} className="relative aspect-[3/4] w-full shrink-0 snap-center bg-secondary">
              <Image src={img.url} alt={img.alt ?? name} fill priority={i === 0} sizes="100vw" quality={85} className="object-cover" />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
            {images.map((img, i) => (
              <span key={img.id} className={cn("h-[3px] w-6 transition-colors", i === activeIndex ? "bg-foreground" : "bg-white/70")} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: hover zoom */}
      <div
        className="relative hidden aspect-[3/4] flex-1 cursor-zoom-in overflow-hidden bg-secondary lg:block"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
        onClick={() => setLightbox(true)}
      >
        <Image
          src={active.url}
          alt={active.alt ?? name}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          quality={85}
          className="object-cover transition-transform duration-300 ease-out"
          style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
        <span className="absolute right-4 bottom-4 flex size-9 items-center justify-center rounded-full bg-white/90">
          <Maximize2 className="size-4" aria-hidden />
        </span>
      </div>

      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="h-[92dvh] max-w-[92vw] rounded-none border-0 bg-background p-0 sm:max-w-[92vw]">
          <DialogTitle className="sr-only">{name}</DialogTitle>
          <div className="relative h-full w-full">
            <Image src={active.url} alt={active.alt ?? name} fill sizes="92vw" quality={85} className="object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

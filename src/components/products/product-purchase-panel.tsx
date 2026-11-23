"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/shared/price";
import { QuantitySelector } from "./quantity-selector";
import { SizeGuideDialog } from "./size-guide-dialog";
import { WishlistButton } from "./wishlist-button";
import { useCart } from "@/features/cart/cart-provider";
import { useI18n } from "@/i18n/client";
import {
  findVariant,
  initialSelection,
  isColorAvailable,
  isSizeAvailable,
  validateSelection,
  type Selection,
  type SelectionError,
} from "@/features/products/variant-selection";
import { cn } from "@/lib/utils";
import type { ProductDetailDTO } from "@/types/catalog";

export function ProductPurchasePanel({
  product,
  onColorChange,
  compact = false,
  onAdded,
  stickyMobileBar = false,
}: {
  product: ProductDetailDTO;
  onColorChange?: (colorId: string) => void;
  compact?: boolean;
  onAdded?: () => void;
  stickyMobileBar?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const cart = useCart();
  const [sel, setSel] = useState<Selection>(() =>
    initialSelection(product.sizes, product.colors),
  );
  const [qty, setQty] = useState(1);
  const [errors, setErrors] = useState<{
    size?: SelectionError;
    color?: SelectionError;
    general?: SelectionError;
  }>({});
  const [errorVars, setErrorVars] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<"add" | "buy" | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  // Tooltip above the button that was tapped, so the reason is visible even when the size/colour
  // pickers are scrolled off screen (e.g. the sticky add-to-bag bar on phones).
  const [hint, setHint] = useState<Hint | null>(null);
  const [flash, setFlash] = useState<"color" | "size" | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  function hideHint() {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHint(null);
    setFlash(null);
  }

  function showHint(
    text: string,
    source: HintSource,
    missing: "color" | "size" | null,
  ) {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHint((prev) => ({ text, source, id: (prev?.id ?? 0) + 1 }));
    setFlash(missing);
    hintTimer.current = setTimeout(hideHint, 3500);
    const target =
      missing === "color"
        ? colorRef.current
        : missing === "size"
          ? sizeRef.current
          : null;
    if (target) {
      const r = target.getBoundingClientRect();
      if (r.top < 72 || r.bottom > window.innerHeight - 140) {
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        target.scrollIntoView({
          behavior: reduce ? "auto" : "smooth",
          block: "center",
        });
      }
    }
  }

  const variant = useMemo(
    () => findVariant(product.variants, sel),
    [product.variants, sel],
  );
  const allSoldOut = product.variants.every((v) => v.available <= 0);
  const displayPrice = variant ?? {
    priceCents: product.priceCents,
    compareAtCents: product.compareAtCents,
  };
  const selectedColor = product.colors.find((c) => c.id === sel.colorId);
  const maxQty = variant ? Math.max(1, Math.min(99, variant.available)) : 99;

  function choose(next: Partial<Selection>) {
    const merged = { ...sel, ...next };
    setSel(merged);
    setErrors({});
    hideHint();
    const v = findVariant(product.variants, merged);
    if (v && qty > v.available && v.available > 0) setQty(v.available);
    if (next.colorId) onColorChange?.(next.colorId);
  }

  function submit(mode: "add" | "buy", source: HintSource) {
    const res = validateSelection(product.variants, sel, qty);
    if (!res.ok) {
      const vars: Record<string, number> =
        res.available !== undefined ? { count: res.available } : {};
      setErrors(res.errors);
      setErrorVars(vars);
      const { color, size, general } = res.errors;
      const text =
        color && size
          ? t("product.chooseColorAndSizeError")
          : color
            ? t(color)
            : size
              ? t(size)
              : general
                ? t(general, vars)
                : "";
      showHint(text, source, color ? "color" : size ? "size" : null);
      return;
    }
    hideHint();
    setPending(mode);
    const size = product.sizes.find((s) => s.id === res.variant.sizeId)!;
    const color = product.colors.find((c) => c.id === res.variant.colorId)!;
    cart.addItem(
      {
        variantId: res.variant.id,
        quantity: qty,
        meta: {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          imageUrl:
            product.images.find((i) => i.colorId === color.id)?.url ??
            product.images[0]?.url ??
            null,
          sizeName: size.label ?? size.name,
          colorName: color.label ?? color.name,
          colorHex: color.hex,
          unitCents: res.variant.priceCents,
          compareAtCents: res.variant.compareAtCents,
          available: res.variant.available,
        },
      },
      { openDrawer: mode === "add" },
    );
    setPending(null);
    if (mode === "buy") {
      cart.closeDrawer();
      router.push("/checkout");
      return;
    }
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
    onAdded?.();
  }

  const stock = (() => {
    if (allSoldOut)
      return { label: t("product.outOfStock"), tone: "text-destructive" };
    if (!variant) return null;
    if (variant.available <= 0)
      return { label: t("product.outOfStock"), tone: "text-destructive" };
    if (variant.available <= product.lowStockThreshold)
      return {
        label: t("product.lowStock", { count: variant.available }),
        tone: "text-brand",
      };
    return { label: t("product.inStock"), tone: "text-success" };
  })();

  const addButton = (source: HintSource) => (
    <Button
      size="xl"
      className="relative w-full overflow-hidden"
      onClick={() => submit("add", source)}
      disabled={allSoldOut || pending !== null}
      data-testid="add-to-cart"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={justAdded ? "added" : pending === "add" ? "adding" : "idle"}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="inline-flex items-center gap-2"
        >
          {pending === "add" && <Loader2 className="size-4 animate-spin" />}
          {justAdded && <Check className="size-4" />}
          {allSoldOut
            ? t("product.soldOut")
            : justAdded
              ? t("product.added")
              : t("product.addToCart")}
        </motion.span>
      </AnimatePresence>
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        {!compact && product.brand && (
          <p lang="en" className="eyebrow mb-2">
            {product.brand}
          </p>
        )}
        <h1
          className={cn(
            "font-heading leading-tight",
            compact ? "text-2xl" : "text-[28px] sm:text-4xl",
          )}
        >
          {product.name}
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <Price
            cents={displayPrice.priceCents}
            compareAtCents={displayPrice.compareAtCents}
            size="lg"
          />
          {displayPrice.compareAtCents &&
            displayPrice.compareAtCents > displayPrice.priceCents && (
              <span className="bg-destructive px-2 py-0.5 text-[11px] font-semibold text-white">
                {t("product.off", {
                  percent: Math.round(
                    ((displayPrice.compareAtCents - displayPrice.priceCents) /
                      displayPrice.compareAtCents) *
                      100,
                  ),
                })}
              </span>
            )}
        </div>
        {!compact && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("product.sku")}: {variant?.sku ?? product.sku}
          </p>
        )}
      </div>

      {product.condition && (
        <div
          className="border border-brand/30 bg-brand/5 px-4 py-3"
          data-testid="condition"
        >
          <p className="text-sm">
            <span className="text-xs font-semibold tracking-wider uppercase">
              {t("conditions.label")}:
            </span>{" "}
            <span className="font-medium">
              {t(`conditions.${product.condition}`)}
            </span>
            <span className="ml-2 bg-brand px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase">
              {t("conditions.preLoved")}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(`conditions.hint_${product.condition}`)}{" "}
            {t("conditions.oneOfAKind")}
          </p>
        </div>
      )}

      {/* Colour */}
      <div
        ref={colorRef}
        className={cn(
          "-m-2 p-2 transition-colors duration-500",
          flash === "color" && "bg-destructive/5 ring-1 ring-destructive/40",
        )}
      >
        <fieldset>
          <legend className="mb-3 flex w-full items-center justify-between text-xs">
            <span>
              <span className="font-semibold tracking-wider uppercase">
                {t("product.color")}
              </span>
              {selectedColor && (
                <span className="ml-2 text-muted-foreground">
                  {selectedColor.label ?? selectedColor.name}
                </span>
              )}
            </span>
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {product.colors.map((c) => {
              const available = isColorAvailable(
                product.variants,
                c.id,
                sel.sizeId,
              );
              const active = sel.colorId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => choose({ colorId: c.id })}
                  aria-pressed={active}
                  aria-label={`${c.label ?? c.name}${available ? "" : ` — ${t("product.unavailable")}`}`}
                  title={c.label ?? c.name}
                  className={cn(
                    "relative flex size-10 items-center justify-center rounded-full border transition-all",
                    active
                      ? "border-foreground ring-1 ring-foreground ring-offset-2"
                      : "border-border hover:border-foreground/60",
                  )}
                >
                  <span
                    className="size-7 rounded-full border border-black/10"
                    style={{ backgroundColor: c.hex }}
                  />
                  {!available && (
                    <span
                      className="absolute h-px w-9 rotate-45 bg-foreground/60"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
          {errors.color && (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {t(errors.color)}
            </p>
          )}
        </fieldset>
      </div>

      {/* Size */}
      <div
        ref={sizeRef}
        className={cn(
          "-m-2 p-2 transition-colors duration-500",
          flash === "size" && "bg-destructive/5 ring-1 ring-destructive/40",
        )}
      >
        <fieldset>
          <legend className="mb-3 flex w-full items-center justify-between text-xs">
            <span className="font-semibold tracking-wider uppercase">
              {t("product.size")}
            </span>
            <SizeGuideDialog />
          </legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {product.sizes.map((s) => {
              const available = isSizeAvailable(
                product.variants,
                s.id,
                sel.colorId,
              );
              const active = sel.sizeId === s.id;
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  layout
                  onClick={() => choose({ sizeId: s.id })}
                  aria-pressed={active}
                  aria-label={`${s.label ?? s.name}${available ? "" : ` — ${t("product.unavailable")}`}`}
                  className={cn(
                    "relative h-11 border text-sm transition-colors",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground",
                    !available &&
                      !active &&
                      "text-muted-foreground line-through decoration-foreground/40",
                  )}
                >
                  {s.label ?? s.name}
                </motion.button>
              );
            })}
          </div>
          {errors.size && (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {t(errors.size)}
            </p>
          )}
        </fieldset>
      </div>

      {stock && (
        <p className={cn("text-sm font-medium", stock.tone)}>{stock.label}</p>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <QuantitySelector value={qty} onChange={setQty} max={maxQty} />
          <div className="relative flex-1">
            {addButton("main")}
            <HintBubble hint={hint} source="main" align="center" />
          </div>
          {!compact && (
            <WishlistButton productId={product.id} variant="outline" />
          )}
        </div>
        {!allSoldOut && (
          <div className="relative">
            <Button
              size="xl"
              variant="outline"
              className="w-full"
              onClick={() => submit("buy", "buy")}
              disabled={pending !== null}
              data-testid="order-now"
            >
              {t("product.orderNow")}
            </Button>
            <HintBubble hint={hint} source="buy" align="center" />
          </div>
        )}
        {errors.general && (
          <p className="text-sm text-destructive" role="alert">
            {t(errors.general, errorVars)}
          </p>
        )}
      </div>

      {stickyMobileBar && !allSoldOut && (
        <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">
              {product.name}
            </p>
            <Price
              cents={displayPrice.priceCents}
              compareAtCents={displayPrice.compareAtCents}
              size="sm"
            />
          </div>
          <div className="relative w-44">
            {addButton("sticky")}
            <HintBubble hint={hint} source="sticky" align="end" />
          </div>
        </div>
      )}
    </div>
  );
}

type HintSource = "main" | "buy" | "sticky";
type Hint = { text: string; source: HintSource; id: number };

/**
 * Speech-bubble tooltip above a button. The outer div positions it; the inner motion element
 * animates (a framer-motion transform on the outer div would replace the centring translate).
 */
function HintBubble({
  hint,
  source,
  align,
}: {
  hint: Hint | null;
  source: HintSource;
  align: "center" | "end";
}) {
  const visible = hint?.source === source;
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-full z-40 mb-2.5 w-max max-w-[min(18rem,calc(100vw-2rem))]",
        align === "center" ? "left-1/2 -translate-x-1/2" : "right-0",
      )}
      role="status"
      aria-live="assertive"
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            key={hint.id}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            className="relative flex items-start gap-2 bg-foreground px-3.5 py-2.5 text-[13px] leading-snug text-background shadow-lg"
            data-testid="selection-hint"
          >
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{hint.text}</span>
            <span
              aria-hidden
              className={cn(
                "absolute top-full size-2.5 -translate-y-1/2 rotate-45 bg-foreground",
                align === "center" ? "left-1/2 -ml-[5px]" : "right-8",
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

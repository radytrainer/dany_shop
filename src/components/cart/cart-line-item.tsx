"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { QuantitySelector } from "@/components/products/quantity-selector";
import { AnimatedMoney, Price } from "@/components/shared/price";
import { useCart, type CartLine } from "@/features/cart/cart-provider";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function CartLineItem({ line, onNavigate, size = "md" }: { line: CartLine; onNavigate?: () => void; size?: "sm" | "md" }) {
  const { t } = useI18n();
  const cart = useCart();
  const meta = line.meta;
  const blocked = line.issue === "UNAVAILABLE" || line.issue === "OUT_OF_STOCK";
  const max = meta && meta.available > 0 ? Math.min(99, meta.available) : 99;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24, height: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-4 overflow-hidden py-5"
      data-testid="cart-line"
    >
      <Link
        href={meta ? `/products/${meta.slug}` : "#"}
        onClick={onNavigate}
        className={cn("relative shrink-0 overflow-hidden bg-secondary", size === "sm" ? "h-28 w-21" : "h-36 w-27 sm:h-40 sm:w-30")}
      >
        {meta?.imageUrl && <Image src={meta.imageUrl} alt={meta.name} fill sizes="120px" className={cn("object-cover", blocked && "opacity-50")} />}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={meta ? `/products/${meta.slug}` : "#"} onClick={onNavigate} className="line-clamp-2 text-sm hover:underline">
              {meta?.name ?? "…"}
            </Link>
            {meta && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-full border border-black/15" style={{ backgroundColor: meta.colorHex }} aria-hidden />
                {t("product.color")}: {meta.colorName} · {t("product.size")}: {meta.sizeName}
              </p>
            )}
            {meta && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("cart.unitPrice")}: <Price cents={meta.unitCents} compareAtCents={meta.compareAtCents} size="sm" className="text-foreground" />
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => cart.removeItem(line.variantId)}
            className="-mt-1 -mr-1 p-1 text-muted-foreground hover:text-foreground"
            aria-label={`${t("common.remove")} ${meta?.name ?? ""}`}
            data-testid="remove-line"
          >
            <X className="size-4" />
          </button>
        </div>

        {line.issue && (
          <p className="mt-2 text-xs text-destructive" role="status">
            {line.issue === "INSUFFICIENT" && meta ? t("cart.quantityAdjusted", { count: meta.available }) : t("cart.itemUnavailable")}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          {blocked ? (
            <span />
          ) : (
            <QuantitySelector size="sm" value={line.quantity} max={max} onChange={(n) => cart.setQuantity(line.variantId, n)} />
          )}
          {meta && !blocked && (
            <div className="text-right">
              <span className="sr-only">{t("cart.itemSubtotal")}</span>
              <AnimatedMoney cents={meta.unitCents * Math.min(line.quantity, meta.available || line.quantity)} className="text-sm font-medium" />
            </div>
          )}
        </div>
      </div>
    </motion.li>
  );
}

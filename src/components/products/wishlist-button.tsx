"use client";

import { Heart } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useWishlist } from "@/features/wishlist/wishlist-provider";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function WishlistButton({ productId, className, variant = "floating" }: { productId: string; className?: string; variant?: "floating" | "outline" }) {
  const { has, toggle, hydrated } = useWishlist();
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const active = hydrated && has(productId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      aria-pressed={active}
      aria-label={active ? t("product.removeFromWishlist") : t("product.addToWishlist")}
      className={cn(
        "relative inline-flex items-center justify-center transition-colors",
        variant === "floating" && "size-10 rounded-full bg-white/85 backdrop-blur-sm hover:bg-white",
        variant === "outline" && "size-12 shrink-0 rounded-sm border border-border hover:border-foreground",
        className,
      )}
    >
      <motion.span
        key={active ? "on" : "off"}
        initial={reduce ? false : { scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 15 }}
        className="inline-flex"
      >
        <Heart className={cn("size-[18px]", active ? "fill-destructive stroke-destructive" : "stroke-foreground")} strokeWidth={1.6} />
      </motion.span>
      <AnimatePresence>
        {active && !reduce && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full border border-destructive/50"
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
    </button>
  );
}

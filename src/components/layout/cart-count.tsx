"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCart } from "@/features/cart/cart-provider";
import { cn } from "@/lib/utils";

/** Animated badge showing the number of units in the bag. */
export function CartCount({ className }: { className?: string }) {
  const { count, hydrated } = useCart();
  const reduce = useReducedMotion();
  if (!hydrated || count === 0) return null;
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={count}
        initial={reduce ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.4, opacity: 0 }}
        transition={{ type: "spring", stiffness: 600, damping: 22 }}
        className={cn(
          "absolute -top-1 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background tabular-nums",
          className,
        )}
        data-testid="cart-count"
      >
        {count > 99 ? "99+" : count}
      </motion.span>
    </AnimatePresence>
  );
}

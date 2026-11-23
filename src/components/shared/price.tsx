"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMoney } from "@/features/store/store-provider";

export function Price({
  cents,
  compareAtCents,
  className,
  size = "md",
}: {
  cents: number;
  compareAtCents?: number | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { format } = useMoney();
  const onSale = compareAtCents != null && compareAtCents > cents;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span
        className={cn(
          "font-medium tabular-nums",
          size === "sm" && "text-sm",
          size === "md" && "text-[15px]",
          size === "lg" && "text-xl",
          onSale && "text-destructive",
        )}
      >
        {format(cents)}
      </span>
      {onSale && (
        <span className={cn("text-muted-foreground tabular-nums line-through", size === "lg" ? "text-base" : "text-xs")}>
          {format(compareAtCents)}
        </span>
      )}
    </span>
  );
}

/** Money value that cross-fades when it changes (cart totals). */
export function AnimatedMoney({ cents, className }: { cents: number; className?: string }) {
  const { format } = useMoney();
  const reduce = useReducedMotion();
  const text = format(cents);
  return (
    <span className={cn("relative inline-flex overflow-hidden tabular-nums", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          initial={reduce ? false : { y: "60%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: "-60%", opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

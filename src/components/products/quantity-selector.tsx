"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

export function QuantitySelector({
  value,
  onChange,
  max = 99,
  min = 1,
  size = "md",
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  min?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const { t } = useI18n();
  const h = size === "sm" ? "h-9" : "h-12";
  return (
    <div className={cn("inline-flex items-center border border-border", h, className)} role="group" aria-label={t("product.quantity")}>
      <button
        type="button"
        className={cn("flex h-full items-center justify-center text-foreground disabled:opacity-30", size === "sm" ? "w-8" : "w-11")}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={t("a11y.decrease")}
      >
        <Minus className="size-3.5" />
      </button>
      <span className={cn("min-w-8 text-center text-sm tabular-nums", size === "sm" && "min-w-6")} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={cn("flex h-full items-center justify-center text-foreground disabled:opacity-30", size === "sm" ? "w-8" : "w-11")}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={t("a11y.increase")}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

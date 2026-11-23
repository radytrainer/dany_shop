"use client";

import { useState } from "react";
import { Loader2, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/cart-provider";
import { useMoney } from "@/features/store/store-provider";
import { useI18n } from "@/i18n/client";
import { errorText } from "@/i18n/errors";
import { ApiClientError } from "@/lib/fetcher";
import type { CouponStatus } from "@/types/cart";

export function useCouponMessage() {
  const { t } = useI18n();
  const { format } = useMoney();
  return (c: CouponStatus | null) => {
    if (!c || c.ok || !c.reason) return null;
    return t(`coupon.${c.reason}`, { amount: c.minOrderCents ? format(c.minOrderCents) : "" });
  };
}

export function CouponForm() {
  const { t } = useI18n();
  const cart = useCart();
  const message = useCouponMessage();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A previously applied coupon may become invalid (e.g. items removed below the minimum).
  const applied = cart.couponCode;
  const liveStatus = cart.quote?.coupon && cart.quote.coupon.code === applied ? cart.quote.coupon : null;
  const liveError = liveStatus && !liveStatus.ok ? message(liveStatus) : null;

  async function apply() {
    const value = code.trim();
    if (!value) return;
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(value)) {
      setError(t("coupon.INVALID"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await cart.applyCoupon(value);
      if (!res?.ok) setError(message(res) ?? t("coupon.INVALID"));
      else setCode("");
    } catch (err) {
      setError(err instanceof ApiClientError && err.status === 429 ? errorText(t, err) : t("coupon.INVALID"));
    } finally {
      setLoading(false);
    }
  }

  if (applied) {
    return (
      <div>
        <div className="flex items-center justify-between bg-secondary px-3 py-2.5 text-sm">
          <span className="inline-flex items-center gap-2">
            <Tag className="size-4" aria-hidden />
            {t("cart.couponApplied", { code: applied })}
          </span>
          <button type="button" onClick={cart.removeCoupon} aria-label={t("cart.couponRemove")} className="p-1">
            <X className="size-4" />
          </button>
        </div>
        {liveError && (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {liveError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div role="group" aria-labelledby="coupon-label">
      <label id="coupon-label" htmlFor="coupon" className="mb-1.5 block text-xs font-semibold tracking-wider uppercase">
        {t("cart.couponLabel")}
      </label>
      <div className="flex gap-2">
        <input
          id="coupon"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t("cart.couponPlaceholder")}
          autoComplete="off"
          maxLength={40}
          className="h-11 min-w-0 flex-1 border px-3 text-sm uppercase outline-none focus:border-foreground"
          aria-invalid={!!error}
          data-testid="coupon-input"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void apply();
            }
          }}
        />
        <Button type="button" onClick={() => void apply()} variant="outline" className="h-11 rounded-sm px-5 text-xs tracking-wider uppercase" disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : t("cart.couponApply")}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert" data-testid="coupon-error">
          {error}
        </p>
      )}
    </div>
  );
}

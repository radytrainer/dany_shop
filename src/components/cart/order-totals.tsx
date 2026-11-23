"use client";

import { Loader2 } from "lucide-react";
import { AnimatedMoney } from "@/components/shared/price";
import { useCart } from "@/features/cart/cart-provider";
import { useMoney } from "@/features/store/store-provider";
import { useI18n } from "@/i18n/client";

/**
 * Totals: Grand Total = Subtotal − Discount + Delivery (+ Tax).
 * Subtotal updates instantly from line prices; discount/delivery/tax come from the
 * latest server quote (the server recalculates everything again when the order is placed).
 */
export function OrderTotals({ showDelivery = false }: { showDelivery?: boolean }) {
  const { t } = useI18n();
  const cart = useCart();
  const { khr } = useMoney();
  const q = cart.quote;
  const subtotal = cart.subtotalCents;
  const discount = Math.min(q?.discountCents ?? 0, subtotal);
  const delivery = showDelivery && cart.deliveryMethodId ? (q?.deliveryCents ?? 0) : 0;
  const tax = q?.taxCents ?? 0;
  const total = subtotal - discount + delivery + tax;
  const approx = khr(total);

  return (
    <dl className="space-y-2.5 text-sm" data-testid="order-totals">
      <div className="flex justify-between">
        <dt>{t("cart.subtotal")}</dt>
        <dd data-testid="subtotal">
          <AnimatedMoney cents={subtotal} />
        </dd>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-success">
          <dt>
            {t("cart.discount")}
            {cart.couponCode && <span className="ml-1 text-xs">({cart.couponCode})</span>}
          </dt>
          <dd data-testid="discount" className="inline-flex">
            −<AnimatedMoney cents={discount} />
          </dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt>{t("cart.delivery")}</dt>
        <dd data-testid="delivery" className="text-right">
          {showDelivery && cart.deliveryMethodId ? (
            delivery === 0 ? (
              t("checkout.free")
            ) : (
              <AnimatedMoney cents={delivery} />
            )
          ) : (
            <span className="text-xs text-muted-foreground">{t("cart.deliveryCalculated")}</span>
          )}
        </dd>
      </div>
      {tax > 0 && (
        <div className="flex justify-between">
          <dt>{t("cart.tax")}</dt>
          <dd>
            <AnimatedMoney cents={tax} />
          </dd>
        </div>
      )}
      <div className="flex items-baseline justify-between border-t pt-3 text-base font-semibold">
        <dt className="inline-flex items-center gap-2">
          {t("cart.total")}
          {cart.quoting && <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label={t("common.loading")} />}
        </dt>
        <dd data-testid="grand-total">
          <AnimatedMoney cents={total} />
        </dd>
      </div>
      {approx && <p className="text-right text-xs text-muted-foreground">{t("cart.approxKhr", { amount: approx })}</p>}
    </dl>
  );
}

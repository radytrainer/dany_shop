"use client";

import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useCart } from "@/features/cart/cart-provider";
import { useI18n } from "@/i18n/client";
import { CartLineItem } from "./cart-line-item";
import { CouponForm } from "./coupon-form";
import { OrderTotals } from "./order-totals";

export function CartPageView() {
  const { t } = useI18n();
  const cart = useCart();

  if (!cart.hydrated) {
    return (
      <div className="container-page py-10">
        <Skeleton className="h-10 w-56 rounded-none" />
        <Skeleton className="mt-8 h-40 w-full rounded-none" />
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return <EmptyState icon={ShoppingBag} title={t("cart.empty")} body={t("cart.emptyBody")} action={{ label: t("cart.continueShopping"), href: "/shop" }} />;
  }

  const blocked = cart.lines.some((l) => l.issue === "UNAVAILABLE" || l.issue === "OUT_OF_STOCK");

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="flex items-end justify-between">
        <h1 className="font-heading text-4xl sm:text-5xl">
          {t("cart.title")} <span className="text-lg text-muted-foreground">({cart.count})</span>
        </h1>
        <button
          type="button"
          className="text-xs underline underline-offset-4"
          onClick={() => {
            if (window.confirm(t("cart.clearConfirm"))) cart.clear();
          }}
          data-testid="clear-cart"
        >
          {t("cart.clearCart")}
        </button>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-16">
        <div>
          {blocked && <p className="mb-4 bg-destructive/10 px-4 py-3 text-sm text-destructive">{t("cart.unavailableItems")}</p>}
          <ul className="divide-y border-y">
            <AnimatePresence initial={false}>
              {cart.lines.map((line) => (
                <CartLineItem key={line.variantId} line={line} />
              ))}
            </AnimatePresence>
          </ul>
          <Link href="/shop" className="mt-6 inline-block text-xs font-semibold tracking-[0.14em] uppercase underline underline-offset-4">
            {t("cart.continueShopping")}
          </Link>
        </div>

        <aside className="h-fit space-y-6 bg-secondary p-6 lg:sticky lg:top-24">
          <h2 className="font-heading text-2xl">{t("checkout.orderSummary")}</h2>
          <CouponForm />
          <OrderTotals />
          <Button asChild size="xl" className="w-full" aria-disabled={blocked}>
            <Link href="/checkout" data-testid="cart-checkout">
              {t("cart.checkout")}
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">{t("checkout.noPayment")}</p>
        </aside>
      </div>
    </div>
  );
}

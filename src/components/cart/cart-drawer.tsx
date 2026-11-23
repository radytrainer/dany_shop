"use client";

import Link, { useLinkStatus } from "next/link";
import { AnimatePresence } from "framer-motion";
import { Loader2, ShoppingBag } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimatedMoney } from "@/components/shared/price";
import { useCart } from "@/features/cart/cart-provider";
import { useMoney } from "@/features/store/store-provider";
import { useI18n } from "@/i18n/client";
import { CartLineItem } from "./cart-line-item";

export function CartDrawer() {
  const { t } = useI18n();
  const cart = useCart();
  const { khr } = useMoney();
  const blocked = cart.lines.some((l) => l.issue === "UNAVAILABLE" || l.issue === "OUT_OF_STOCK");
  const approx = khr(cart.subtotalCents);

  return (
    <Sheet open={cart.drawerOpen} onOpenChange={(o) => (o ? cart.openDrawer() : cart.closeDrawer())}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md" data-testid="cart-drawer">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="font-heading text-xl font-normal">
            {t("cart.title")} {cart.count > 0 && <span className="text-sm text-muted-foreground">({cart.count})</span>}
          </SheetTitle>
        </SheetHeader>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <ShoppingBag className="size-10 text-muted-foreground" strokeWidth={1.2} aria-hidden />
            <p className="mt-4 font-heading text-xl">{t("cart.empty")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("cart.emptyBody")}</p>
            <Button size="xl" className="mt-8" onClick={cart.closeDrawer} asChild>
              <Link href="/shop">{t("cart.continueShopping")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y overflow-y-auto px-5">
              <AnimatePresence initial={false}>
                {cart.lines.map((line) => (
                  <CartLineItem key={line.variantId} line={line} onNavigate={cart.closeDrawer} size="sm" />
                ))}
              </AnimatePresence>
            </ul>
            <div className="space-y-3 border-t px-5 pt-4 pb-5 pb-safe">
              {blocked && <p className="text-xs text-destructive">{t("cart.unavailableItems")}</p>}
              <div className="flex items-center justify-between text-sm">
                <span>{t("cart.subtotal")}</span>
                <AnimatedMoney cents={cart.subtotalCents} className="font-semibold" />
              </div>
              {approx && <p className="-mt-2 text-right text-xs text-muted-foreground">{t("cart.approxKhr", { amount: approx })}</p>}
              <p className="text-xs text-muted-foreground">
                {t("cart.delivery")}: {t("cart.deliveryCalculated")}
              </p>
              <Link href="/checkout" data-testid="drawer-checkout" className={cn(buttonVariants({ size: "xl" }), "w-full")}>
                <PendingLabel>{t("cart.checkout")}</PendingLabel>
              </Link>
              <Link href="/cart" className={cn(buttonVariants({ size: "xl", variant: "outline" }), "w-full")}>
                <PendingLabel>{t("cart.viewCart")}</PendingLabel>
              </Link>
              <button
                type="button"
                onClick={cart.closeDrawer}
                className="block w-full py-1.5 text-center text-xs font-medium tracking-[0.14em] uppercase underline-offset-4 hover:underline"
              >
                {t("cart.continueShopping")}
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Link label with a spinner while the target page loads (the tap always gets visible feedback). */
function PendingLabel({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span className="inline-flex items-center gap-2" aria-busy={pending}>
      <Loader2 className={cn("size-4 animate-spin", !pending && "hidden")} aria-hidden />
      {children}
    </span>
  );
}

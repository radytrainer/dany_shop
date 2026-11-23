"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/fetcher";
import { computeSubtotal } from "@/lib/calculations/pricing";
import { createLocalStore, hydratedSnapshot } from "@/lib/local-store";
import { useI18n } from "@/i18n/client";
import { useSessionUser } from "@/features/session/session-provider";
import type { CartItemMeta, CartQuote, CouponStatus } from "@/types/cart";

type StoredItem = { variantId: string; quantity: number; meta: CartItemMeta | null };
/** ownerId: the account this local cart was last synced with (null = guest cart). */
type StoredCart = { items: StoredItem[]; couponCode: string | null; ownerId: string | null };

const EMPTY: StoredCart = { items: [], couponCode: null, ownerId: null };

function parseCart(raw: unknown): StoredCart {
  const v = raw as Partial<StoredCart> | null;
  if (!v || !Array.isArray(v.items)) return EMPTY;
  return {
    items: v.items.filter((i) => typeof i?.variantId === "string" && Number.isInteger(i.quantity) && i.quantity > 0).slice(0, 50),
    couponCode: typeof v.couponCode === "string" ? v.couponCode : null,
    ownerId: typeof v.ownerId === "string" ? v.ownerId : null,
  };
}

const cartStore = createLocalStore<StoredCart>("ds_cart_v1", parseCart, EMPTY);
type ServerItems = { items: { variantId: string; quantity: number }[] };

export type CartLine = StoredItem & { issue: CartQuote["lines"][number]["issue"] };

type CartContextValue = {
  hydrated: boolean;
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  quote: CartQuote | null;
  quoting: boolean;
  couponCode: string | null;
  deliveryMethodId: string | null;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (item: { variantId: string; quantity: number; meta: CartItemMeta }, opts?: { openDrawer?: boolean }) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
  applyCoupon: (code: string) => Promise<CouponStatus | null>;
  removeCoupon: () => void;
  setDeliveryMethodId: (id: string | null) => void;
  refreshQuote: () => Promise<CartQuote | null>;
};

const CartContext = createContext<CartContextValue | null>(null);
const plainItems = (c: StoredCart) => c.items.map(({ variantId, quantity }) => ({ variantId, quantity }));

export function CartProvider({ children }: { children: ReactNode }) {
  const user = useSessionUser();
  const { t } = useI18n();
  const cart = useSyncExternalStore(cartStore.subscribe, cartStore.get, cartStore.getServer);
  const hydrated = useSyncExternalStore(hydratedSnapshot.subscribe, hydratedSnapshot.client, hydratedSnapshot.server);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [deliveryMethodId, setDeliveryMethodId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Links inside the bag drawer do not close it when tapped: closing (animation + scroll lock)
  // at the same moment as navigating made taps on phones sometimes do nothing. The drawer stays
  // open, showing the link's loading state, and closes here once the new page has arrived.
  const pathname = usePathname();
  const [drawerPath, setDrawerPath] = useState(pathname);
  if (pathname !== drawerPath) {
    setDrawerPath(pathname);
    if (drawerOpen) setDrawerOpen(false);
  }
  const syncedUserRef = useRef<string | null | undefined>(undefined);
  const quoteSeq = useRef(0);

  // Account sync: merge a guest cart on login, load the saved cart for another account, clear on logout.
  useEffect(() => {
    if (!hydrated) return;
    const userId = user?.id ?? null;
    if (syncedUserRef.current === userId) return;
    syncedUserRef.current = userId;
    const current = cartStore.get();
    if (!userId) {
      if (current.ownerId) cartStore.set(() => EMPTY);
      return;
    }
    const request =
      current.ownerId === userId
        ? api<ServerItems>("/api/cart", { method: "PUT", json: { items: plainItems(current) } })
        : current.ownerId === null
          ? api<ServerItems>("/api/cart/merge", { method: "POST", json: { items: plainItems(current) } })
          : api<ServerItems>("/api/cart");
    request
      .then(({ items }) =>
        cartStore.set((c) => {
          const metaById = new Map(c.items.map((i) => [i.variantId, i.meta]));
          return { ...c, ownerId: userId, items: items.map((i) => ({ ...i, meta: metaById.get(i.variantId) ?? null })) };
        }),
      )
      .catch(() => undefined);
  }, [user?.id, hydrated]);

  // Persist to the account (debounced) once synced.
  useEffect(() => {
    if (!hydrated || !user || cart.ownerId !== user.id) return;
    const timer = setTimeout(() => {
      api("/api/cart", { method: "PUT", json: { items: plainItems(cart) } }).catch(() => undefined);
    }, 600);
    return () => clearTimeout(timer);
  }, [cart, user, hydrated]);

  const runQuote = useCallback(async (): Promise<CartQuote | null> => {
    const current = cartStore.get();
    const seq = ++quoteSeq.current;
    if (current.items.length === 0) {
      setQuote(null);
      return null;
    }
    setQuoting(true);
    try {
      const q = await api<CartQuote>("/api/cart/quote", {
        method: "POST",
        json: { items: plainItems(current), couponCode: current.couponCode, deliveryMethodId },
      });
      if (seq !== quoteSeq.current) return q; // a newer quote is in flight
      setQuote(q);
      // Refresh display snapshots with authoritative server data. Only drop variants that were part of
      // this request but no longer exist — items added while the request was in flight are kept.
      const byId = new Map(q.lines.map((l) => [l.variantId, l]));
      const requested = new Set(current.items.map((i) => i.variantId));
      cartStore.set((c) => ({
        ...c,
        items: c.items
          .filter((i) => byId.has(i.variantId) || !requested.has(i.variantId))
          .map((i) => {
            const l = byId.get(i.variantId);
            if (!l) return i;
            return {
              ...i,
              meta: {
                productId: l.productId,
                slug: l.slug,
                name: l.name,
                imageUrl: l.imageUrl,
                sizeName: l.sizeName,
                colorName: l.colorName,
                colorHex: l.colorHex,
                unitCents: l.unitCents,
                compareAtCents: l.compareAtCents,
                available: l.available,
              },
            };
          }),
      }));
      return q;
    } catch {
      return null;
    } finally {
      if (seq === quoteSeq.current) setQuoting(false);
    }
  }, [deliveryMethodId]);

  // Re-quote (debounced) whenever items, coupon or delivery change.
  const quoteKey = JSON.stringify([cart.items.map((i) => [i.variantId, i.quantity]), cart.couponCode, deliveryMethodId]);
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => void runQuote(), 250);
    return () => clearTimeout(timer);
  }, [quoteKey, hydrated, runQuote]);

  const addItem = useCallback<CartContextValue["addItem"]>(
    ({ variantId, quantity, meta }, opts) => {
      cartStore.set((c) => {
        const existing = c.items.find((i) => i.variantId === variantId);
        const max = Math.max(1, Math.min(99, meta.available));
        if (existing) {
          return { ...c, items: c.items.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(max, i.quantity + quantity), meta } : i)) };
        }
        return { ...c, items: [...c.items, { variantId, quantity: Math.min(max, quantity), meta }] };
      });
      if (opts?.openDrawer !== false) setDrawerOpen(true);
      else toast.success(t("product.added"));
    },
    [t],
  );

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    cartStore.set((c) => ({
      ...c,
      items:
        quantity <= 0
          ? c.items.filter((i) => i.variantId !== variantId)
          : c.items.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(99, Math.floor(quantity)) } : i)),
    }));
  }, []);

  const removeItem = useCallback((variantId: string) => {
    cartStore.set((c) => ({ ...c, items: c.items.filter((i) => i.variantId !== variantId) }));
  }, []);

  const clear = useCallback(() => cartStore.set((c) => ({ ...c, items: [], couponCode: null })), []);

  const applyCoupon = useCallback(async (code: string) => {
    const res = await api<{ coupon: CouponStatus | null }>("/api/coupons/validate", { method: "POST", json: { code, items: plainItems(cartStore.get()) } });
    if (res.coupon?.ok) cartStore.set((c) => ({ ...c, couponCode: res.coupon!.code }));
    return res.coupon;
  }, []);

  const removeCoupon = useCallback(() => cartStore.set((c) => ({ ...c, couponCode: null })), []);

  const value = useMemo<CartContextValue>(() => {
    const issues = new Map(quote?.lines.map((l) => [l.variantId, l.issue]) ?? []);
    const lines: CartLine[] = cart.items.map((i) => ({ ...i, issue: issues.get(i.variantId) ?? null }));
    const subtotalCents = computeSubtotal(
      lines
        .filter((l) => l.meta && l.issue !== "UNAVAILABLE" && l.issue !== "OUT_OF_STOCK")
        .map((l) => ({ unitCents: l.meta!.unitCents, quantity: l.meta!.available > 0 ? Math.min(l.quantity, l.meta!.available) : l.quantity })),
    );
    return {
      hydrated,
      lines,
      count: cart.items.reduce((n, i) => n + i.quantity, 0),
      subtotalCents,
      quote,
      quoting,
      couponCode: cart.couponCode,
      deliveryMethodId,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      addItem,
      setQuantity,
      removeItem,
      clear,
      applyCoupon,
      removeCoupon,
      setDeliveryMethodId,
      refreshQuote: runQuote,
    };
  }, [cart, hydrated, quote, quoting, deliveryMethodId, drawerOpen, addItem, setQuantity, removeItem, clear, applyCoupon, removeCoupon, runQuote]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

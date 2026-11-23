"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import { api } from "@/lib/fetcher";
import { createLocalStore, hydratedSnapshot } from "@/lib/local-store";
import { useI18n } from "@/i18n/client";
import { useSessionUser } from "@/features/session/session-provider";

type Stored = { productIds: string[]; ownerId: string | null };
const EMPTY: Stored = { productIds: [], ownerId: null };

const wishlistStore = createLocalStore<Stored>(
  "ds_wishlist_v1",
  (raw) => {
    const v = raw as Partial<Stored> | null;
    if (!v || !Array.isArray(v.productIds)) return EMPTY;
    return { productIds: v.productIds.filter((x) => typeof x === "string").slice(0, 200), ownerId: typeof v.ownerId === "string" ? v.ownerId : null };
  },
  EMPTY,
);

type WishlistValue = {
  hydrated: boolean;
  productIds: string[];
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
  remove: (productId: string) => void;
};

const WishlistContext = createContext<WishlistValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const user = useSessionUser();
  const { t } = useI18n();
  const state = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.get, wishlistStore.getServer);
  const hydrated = useSyncExternalStore(hydratedSnapshot.subscribe, hydratedSnapshot.client, hydratedSnapshot.server);
  const syncedRef = useRef<string | null | undefined>(undefined);

  // Merge the guest wishlist into the account on login; clear the local copy on logout.
  useEffect(() => {
    if (!hydrated) return;
    const userId = user?.id ?? null;
    if (syncedRef.current === userId) return;
    syncedRef.current = userId;
    const current = wishlistStore.get();
    if (!userId) {
      if (current.ownerId) wishlistStore.set(() => EMPTY);
      return;
    }
    const guestIds = current.ownerId === null ? current.productIds : [];
    api<{ productIds: string[] }>("/api/customers/wishlist", { method: "POST", json: { productIds: guestIds } })
      .then(({ productIds }) => wishlistStore.set(() => ({ productIds, ownerId: userId })))
      .catch(() => undefined);
  }, [user?.id, hydrated]);

  const remove = useCallback(
    (productId: string) => {
      wishlistStore.set((s) => ({ ...s, productIds: s.productIds.filter((id) => id !== productId) }));
      if (user) api(`/api/customers/wishlist/${productId}`, { method: "DELETE" }).catch(() => undefined);
    },
    [user],
  );

  const toggle = useCallback(
    (productId: string) => {
      if (wishlistStore.get().productIds.includes(productId)) {
        remove(productId);
        toast(t("wishlist.removed"));
        return;
      }
      wishlistStore.set((s) => ({ ...s, productIds: [productId, ...s.productIds] }));
      toast.success(t("wishlist.added"));
      if (user) api("/api/customers/wishlist", { method: "POST", json: { productIds: [productId] } }).catch(() => undefined);
    },
    [remove, t, user],
  );

  const value = useMemo<WishlistValue>(() => {
    const set = new Set(state.productIds);
    return { hydrated, productIds: state.productIds, has: (id) => set.has(id), toggle, remove };
  }, [state.productIds, hydrated, toggle, remove]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}

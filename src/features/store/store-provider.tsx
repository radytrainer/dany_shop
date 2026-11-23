"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { convertWithRate, formatMoney } from "@/lib/money";
import { useI18n } from "@/i18n/client";

export type StoreClientConfig = {
  storeName: string;
  logoUrl: string | null;
  currency: string;
  khrExchangeRate: string | null;
  showKhrEquivalent: boolean;
  telegramUsername: string | null;
  messengerUrl: string | null;
  whatsappNumber: string | null;
  defaultChannel: "TELEGRAM" | "WHATSAPP" | "MESSENGER";
  sizeGuide: string | null;
  shippingInfo: string | null;
};

const StoreContext = createContext<StoreClientConfig | null>(null);

export function StoreProvider({ config, children }: { config: StoreClientConfig; children: ReactNode }) {
  return <StoreContext.Provider value={config}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/** Format cents in the store currency and the active language. */
export function useMoney() {
  const store = useStore();
  const { locale } = useI18n();
  const format = useCallback((cents: number) => formatMoney(cents, store.currency, locale), [store.currency, locale]);
  const khr = useCallback(
    (cents: number) => {
      if (!store.showKhrEquivalent || store.currency !== "USD" || !store.khrExchangeRate) return null;
      return formatMoney(convertWithRate(cents, store.khrExchangeRate), "KHR", locale);
    },
    [store.showKhrEquivalent, store.currency, store.khrExchangeRate, locale],
  );
  return { format, khr, currency: store.currency };
}

import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { CartPageView } from "@/components/cart/cart-page-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("cart.title"), robots: { index: false } };
}

export default function CartPage() {
  return <CartPageView />;
}

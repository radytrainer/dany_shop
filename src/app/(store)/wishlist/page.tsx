import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { WishlistView } from "@/components/products/wishlist-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("wishlist.title"), robots: { index: false } };
}

export default function WishlistPage() {
  return <WishlistView />;
}

import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDeliveryMethods } from "@/services/delivery";
import { getStoreSettings } from "@/services/settings";
import { messengerLink, normalizeTelegramUsername, normalizeWhatsappNumber } from "@/lib/messaging/order-message";
import { toCents } from "@/lib/money";
import { CheckoutView, type SavedAddress } from "@/components/checkout/checkout-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("checkout.title"), robots: { index: false } };
}

export default async function CheckoutPage() {
  const { locale } = await getI18n();
  const [user, settings, deliveryMethods] = await Promise.all([getCurrentUser(), getStoreSettings(), getDeliveryMethods(locale)]);

  let addresses: SavedAddress[] = [];
  let telegramUsername: string | null = null;
  if (user) {
    const [rows, profile] = await Promise.all([
      prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
      prisma.customerProfile.findUnique({ where: { userId: user.id } }),
    ]);
    telegramUsername = profile?.telegramUsername ?? null;
    addresses = rows.map((a) => ({
      id: a.id,
      label: a.label,
      fullName: a.fullName,
      phone: a.phone,
      province: a.province,
      district: a.district,
      commune: a.commune,
      addressLine: a.addressLine,
      notes: a.notes,
      isDefault: a.isDefault,
    }));
  }

  const channels = {
    TELEGRAM: !!normalizeTelegramUsername(settings.telegramUsername),
    WHATSAPP: !!normalizeWhatsappNumber(settings.whatsappNumber),
    MESSENGER: !!messengerLink(settings.messengerUrl),
  };

  return (
    <CheckoutView
      deliveryMethods={deliveryMethods}
      channels={channels}
      defaultChannel={channels[settings.defaultChannel] ? settings.defaultChannel : (Object.keys(channels) as (keyof typeof channels)[]).find((k) => channels[k]) ?? null}
      minOrderCents={settings.minOrderAmount ? toCents(settings.minOrderAmount) : null}
      user={user ? { name: user.name, email: user.email, phone: user.phone, telegramUsername } : null}
      addresses={addresses}
    />
  );
}

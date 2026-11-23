/**
 * Builds the order text and deep links sent to the seller via Telegram / WhatsApp / Messenger.
 * Pure and isomorphic: used on the server (persisted order data) and covered by unit tests.
 */
import { formatMoney } from "@/lib/money";

export type MessageLabels = {
  newOrder: string;
  orderNumber: string;
  customer: string;
  name: string;
  phone: string;
  telegram: string;
  email: string;
  deliveryAddress: string;
  deliveryMethod: string;
  notes: string;
  orderDetails: string;
  size: string;
  color: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  orderSummary: string;
  discount: string;
  delivery: string;
  tax: string;
  total: string;
  coupon: string;
  closing: string;
  viewOrder: string;
};

export type OrderMessageData = {
  orderNumber: string;
  currency: string;
  customerName: string;
  phone: string;
  telegramUsername: string | null;
  email: string | null;
  addressLine: string;
  commune: string;
  district: string;
  province: string;
  deliveryMethodName: string;
  deliveryNotes: string | null;
  items: { productName: string; sizeName: string; colorName: string; quantity: number; unitCents: number; lineCents: number }[];
  subtotalCents: number;
  discountCents: number;
  deliveryCents: number;
  taxCents: number;
  grandTotalCents: number;
  couponCode: string | null;
  orderUrl?: string | null;
};

/** Keep deep links comfortably below platform URL limits. */
export const MAX_MESSAGE_LENGTH = 3000;

export function buildOrderMessage(o: OrderMessageData, L: MessageLabels, locale = "en"): string {
  const money = (c: number) => formatMoney(c, o.currency, locale);
  const lines: string[] = [];
  lines.push(L.newOrder, "", `${L.orderNumber}: ${o.orderNumber}`, "");
  lines.push(`${L.customer}:`, `${L.name}: ${o.customerName}`, `${L.phone}: ${o.phone}`);
  if (o.telegramUsername) lines.push(`${L.telegram}: @${o.telegramUsername}`);
  if (o.email) lines.push(`${L.email}: ${o.email}`);
  lines.push("", `${L.deliveryAddress}:`, [o.addressLine, o.commune, o.district, o.province].filter(Boolean).join(", "));
  lines.push(`${L.deliveryMethod}: ${o.deliveryMethodName}`);
  if (o.deliveryNotes) lines.push(`${L.notes}: ${o.deliveryNotes}`);
  lines.push("", `${L.orderDetails}:`, "");

  const itemBlocks = o.items.map((it, i) =>
    [
      `${i + 1}. ${it.productName}`,
      `   ${L.size}: ${it.sizeName}`,
      `   ${L.color}: ${it.colorName}`,
      `   ${L.quantity}: ${it.quantity}`,
      `   ${L.unitPrice}: ${money(it.unitCents)}`,
      `   ${L.subtotal}: ${money(it.lineCents)}`,
    ].join("\n"),
  );

  const summary = [
    "",
    `${L.orderSummary}:`,
    "",
    `${L.subtotal}: ${money(o.subtotalCents)}`,
    `${L.discount}: ${money(o.discountCents)}${o.couponCode ? ` (${L.coupon}: ${o.couponCode})` : ""}`,
    `${L.delivery}: ${money(o.deliveryCents)}`,
    ...(o.taxCents > 0 ? [`${L.tax}: ${money(o.taxCents)}`] : []),
    "",
    `${L.total}: ${money(o.grandTotalCents)}`,
    "",
    ...(o.orderUrl ? [`${L.viewOrder}: ${o.orderUrl}`, ""] : []),
    L.closing,
  ].join("\n");

  // If the order is very large, list as many items as fit and point to the order link for the rest.
  const head = lines.join("\n");
  const kept: string[] = [];
  for (const block of itemBlocks) {
    const candidate = [head, ...kept, block].join("\n\n") + summary;
    if (candidate.length > MAX_MESSAGE_LENGTH && kept.length > 0) {
      kept.push(`… +${itemBlocks.length - kept.length}`);
      break;
    }
    kept.push(block);
  }
  return `${head}${kept.join("\n\n")}\n${summary}`;
}

export function normalizeTelegramUsername(u: string | null | undefined): string | null {
  const v = (u ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//i, "");
  return /^[A-Za-z0-9_]{5,32}$/.test(v) ? v : null;
}

export function normalizeWhatsappNumber(n: string | null | undefined): string | null {
  const digits = (n ?? "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function telegramLink(username: string | null | undefined, text: string): string | null {
  const u = normalizeTelegramUsername(username);
  return u ? `https://t.me/${u}?text=${encodeURIComponent(text)}` : null;
}

export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const p = normalizeWhatsappNumber(phone);
  return p ? `https://wa.me/${p}?text=${encodeURIComponent(text)}` : null;
}

/** Messenger links cannot reliably prefill text; we only open the configured page. */
export function messengerLink(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const allowed = ["m.me", "www.m.me", "messenger.com", "www.messenger.com", "facebook.com", "www.facebook.com", "m.facebook.com"];
    return u.protocol === "https:" && allowed.includes(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

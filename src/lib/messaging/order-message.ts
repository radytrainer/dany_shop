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

/**
 * Telegram username from a t.me link (https://t.me/radytv → "radytv"). Used when the seller filled
 * in the Telegram link under "Contact & social" but not the order-messaging username.
 * Group/channel invite links (t.me/+abc, t.me/joinchat/…) are not a chat with the seller → null.
 */
export function telegramUsernameFromLink(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!["t.me", "www.t.me", "telegram.me", "www.telegram.me"].includes(u.hostname)) return null;
    const first = u.pathname.split("/").filter(Boolean)[0] ?? "";
    // Reserved t.me paths are invites, shares and add-ons, not a person or shop account.
    if (["joinchat", "addstickers", "addemoji", "share", "proxy", "socks", "iv", "setlanguage", "addtheme", "c", "s"].includes(first.toLowerCase())) return null;
    return normalizeTelegramUsername(first);
  } catch {
    return null;
  }
}

const FACEBOOK_HOSTS = ["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "fb.com", "www.fb.com"];
const FACEBOOK_NOT_A_PAGE = new Set(["groups", "events", "share", "watch", "marketplace", "story.php", "permalink.php", "photo", "photo.php", "reel", "hashtag", "login", "home.php"]);

/**
 * Messenger chat link from a Facebook page/profile URL, e.g.
 * https://www.facebook.com/Rady.bmcs/ → https://m.me/Rady.bmcs
 * https://facebook.com/profile.php?id=123 → https://m.me/123
 * Returns null for links that are not a page or profile (groups, posts, …).
 */
export function messengerFromFacebookUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    if (u.hostname === "m.me" || u.hostname === "www.m.me") return messengerLink(url);
    if (!FACEBOOK_HOSTS.includes(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "profile.php") {
      const id = u.searchParams.get("id");
      return id && /^\d+$/.test(id) ? `https://m.me/${id}` : null;
    }
    if (parts[0] === "pages" || parts[0] === "people") {
      const id = [...parts].reverse().find((p) => /^\d+$/.test(p));
      return id ? `https://m.me/${id}` : null;
    }
    const name = parts[0];
    if (!name || FACEBOOK_NOT_A_PAGE.has(name.toLowerCase())) return null;
    return /^[A-Za-z0-9.]{3,100}$/.test(name) ? `https://m.me/${name}` : null;
  } catch {
    return null;
  }
}

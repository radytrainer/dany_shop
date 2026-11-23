import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translator";
import { prisma } from "@/lib/prisma";
import { convertWithRate, formatMoney, toCents } from "@/lib/money";
import { translated } from "@/lib/translations";
import { renderReceiptPdf, type ReceiptData } from "@/lib/pdf/receipt";
import { getStoreSettings, localizedSetting } from "./settings";
import type { OrderWithItems } from "./orders";

// Cambodia has one time zone; render dates in it regardless of the server's TZ.
const TIME_ZONE = "Asia/Phnom_Penh";
const PUBLIC_DIR = path.join(process.cwd(), "public");

/** The store logo as bytes, if it is a PNG/JPEG served from /public. Otherwise the name is printed. */
async function loadLogo(logoUrl: string | null): Promise<Buffer | null> {
  if (!logoUrl || !logoUrl.startsWith("/") || !/\.(png|jpe?g)$/i.test(logoUrl)) return null;
  const file = path.normalize(path.join(PUBLIC_DIR, logoUrl));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return null;
  try {
    return await readFile(file);
  } catch {
    return null;
  }
}

/** Localized names for the English snapshots stored on the order (product, colour, size, delivery). */
async function localNames(order: OrderWithItems, locale: Locale) {
  const empty = { product: new Map<string, string>(), color: new Map<string, string>(), size: new Map<string, string>(), delivery: null as string | null };
  if (locale === "en") return empty;
  const productIds = order.items.map((i) => i.productId).filter((id): id is string => !!id);
  const [products, colors, sizes, delivery] = await Promise.all([
    prisma.productTranslation.findMany({ where: { productId: { in: productIds }, locale }, select: { productId: true, name: true } }),
    prisma.color.findMany({ where: { name: { in: order.items.map((i) => i.colorName) } }, select: { name: true, translations: true } }),
    prisma.size.findMany({ where: { name: { in: order.items.map((i) => i.sizeName) } }, select: { name: true, translations: true } }),
    order.deliveryMethodId
      ? prisma.deliveryMethod.findUnique({ where: { id: order.deliveryMethodId }, select: { name: true, translations: true } })
      : null,
  ]);
  return {
    product: new Map(products.filter((p) => p.name).map((p) => [p.productId, p.name])),
    color: new Map(colors.map((c) => [c.name, translated(c.name, c.translations, locale)])),
    size: new Map(sizes.map((z) => [z.name, translated(z.name, z.translations, locale)])),
    // Only trust the live translation while the method still has the name that was snapshotted.
    delivery: delivery && delivery.name === order.deliveryMethodName ? translated(delivery.name, delivery.translations, locale) : null,
  };
}

export async function buildReceiptData(order: OrderWithItems, locale: Locale, now = new Date()): Promise<ReceiptData> {
  const t = createTranslator(locale);
  const settings = await getStoreSettings();
  const names = await localNames(order, locale);
  const money = (v: { toFixed(n: number): string }) => formatMoney(toCents(v), order.currency, locale);
  const dateFmt = new Intl.DateTimeFormat(locale === "km" ? "km-KH" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: TIME_ZONE });

  const address = localizedSetting(settings, "address", locale);
  const storeLines = [address, settings.contactPhone, settings.contactEmail, process.env.APP_URL?.replace(/^https?:\/\//, "")].filter(
    (l): l is string => !!l,
  );

  const totals: ReceiptData["totals"] = [{ label: t("cart.subtotal"), value: money(order.subtotal) }];
  if (toCents(order.discountTotal) > 0) {
    totals.push({ label: order.couponCode ? `${t("cart.discount")} (${order.couponCode})` : t("cart.discount"), value: `-${money(order.discountTotal)}` });
  }
  totals.push({ label: t("cart.delivery"), value: money(order.deliveryFee) });
  if (toCents(order.taxTotal) > 0) totals.push({ label: settings.taxLabel || t("cart.tax"), value: money(order.taxTotal) });
  totals.push({ label: t("cart.grandTotal"), value: money(order.grandTotal), strong: true });

  const khr =
    order.currency === "USD" && settings.showKhrEquivalent && settings.khrExchangeRate
      ? t("receipt.approx", { amount: formatMoney(convertWithRate(toCents(order.grandTotal), settings.khrExchangeRate), "KHR", locale) })
      : null;

  const note: ReceiptData["note"] =
    order.status === "CANCELLED"
      ? { text: t("receipt.cancelledNote"), tone: "muted" }
      : order.paymentStatus === "PAID"
        ? { text: t("receipt.paidNote", { date: dateFmt.format(order.paidAt ?? order.updatedAt) }), tone: "ok" }
        : { text: t("receipt.unpaidNote"), tone: "warn" };

  const contact = [order.phone, order.telegramUsername ? `Telegram: @${order.telegramUsername.replace(/^@/, "")}` : null, order.email];
  const deliveryLines = [
    names.delivery ?? order.deliveryMethodName,
    [order.addressLine, order.commune, order.district, order.province].filter(Boolean).join(", "),
    order.trackingNumber ? `${t("order.tracking")}: ${order.trackingNumber}` : null,
    order.deliveryNotes ? `${t("receipt.notes")}: ${order.deliveryNotes}` : null,
  ];

  return {
    lang: locale,
    logo: await loadLogo(settings.logoUrl),
    storeName: settings.storeName,
    storeLines,
    title: t("receipt.title"),
    orderNumberLabel: t("order.orderNumber"),
    orderNumber: order.orderNumber,
    dateLabel: t("receipt.date"),
    date: dateFmt.format(order.createdAt),
    badges: [
      { label: t("order.status"), value: t(`orderStatus.${order.status}`) },
      { label: t("order.payment"), value: t(`paymentStatus.${order.paymentStatus}`) },
    ],
    parties: [
      { heading: t("receipt.customer"), lines: [order.customerName, ...contact].filter((l): l is string => !!l) },
      { heading: t("receipt.delivery"), lines: deliveryLines.filter((l): l is string => !!l) },
    ],
    columns: { item: t("receipt.item"), qty: t("receipt.qty"), unit: t("receipt.unitPrice"), amount: t("receipt.amount") },
    lines: order.items.map((i) => ({
      name: (i.productId && names.product.get(i.productId)) || i.productName,
      detail: `${t("product.color")}: ${names.color.get(i.colorName) ?? i.colorName} · ${t("product.size")}: ${names.size.get(i.sizeName) ?? i.sizeName}`,
      qty: String(i.quantity),
      unit: money(i.unitPrice),
      amount: money(i.lineTotal),
    })),
    totals,
    totalNote: khr,
    note,
    thanks: t("receipt.thanks"),
    footer: `${settings.storeName} · ${order.orderNumber} · ${t("receipt.generated", { date: dateFmt.format(now) })}`,
  };
}

export async function renderOrderReceipt(order: OrderWithItems, locale: Locale): Promise<Buffer> {
  return renderReceiptPdf(await buildReceiptData(order, locale));
}

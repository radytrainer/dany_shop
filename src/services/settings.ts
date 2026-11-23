import "server-only";
import { cache } from "react";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { storefrontCache } from "@/lib/shared-cache";
import type { Locale } from "@/i18n/config";

export const HOMEPAGE_SECTION_KEYS = [
  "hero",
  "categories",
  "newArrivals",
  "promo",
  "bestSellers",
  "collections",
  "trending",
  "offers",
  "editorial",
  "newsletter",
  "social",
] as const;
export type HomepageSectionKey = (typeof HOMEPAGE_SECTION_KEYS)[number];

const sectionsSchema = z
  .array(z.object({ key: z.enum(HOMEPAGE_SECTION_KEYS), enabled: z.boolean() }))
  .catch([]);
const socialLinksSchema = z
  .object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    tiktok: z.string().optional(),
    telegram: z.string().optional(),
    youtube: z.string().optional(),
  })
  .catch({});
const gallerySchema = z.array(z.object({ imageUrl: z.string(), href: z.string().optional() })).catch([]);
const translatedTextSchema = z.record(z.string(), z.record(z.string(), z.string())).catch({});

export type SocialLinks = z.infer<typeof socialLinksSchema>;

export type StoreSettingsDTO = {
  storeName: string;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  currency: string;
  defaultLocale: string;
  khrExchangeRate: string | null;
  showKhrEquivalent: boolean;
  telegramUsername: string | null;
  messengerUrl: string | null;
  whatsappNumber: string | null;
  defaultChannel: "TELEGRAM" | "WHATSAPP" | "MESSENGER";
  minOrderAmount: string | null;
  taxEnabled: boolean;
  taxRate: string;
  taxLabel: string;
  reservationHours: number;
  deductStockOn: "CONFIRMED" | "PAYMENT_RECEIVED" | "SHIPPED";
  lowStockThreshold: number;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  socialLinks: SocialLinks;
  footerText: string | null;
  shippingInfo: string | null;
  sizeGuide: string | null;
  announcementActive: boolean;
  announcementText: string | null;
  announcementHref: string | null;
  showCollections: boolean;
  translations: Record<string, Record<string, string>>;
  homepageSections: { key: HomepageSectionKey; enabled: boolean }[];
  socialGallery: { imageUrl: string; href?: string }[];
};

const DEFAULTS: StoreSettingsDTO = {
  storeName: "DANY",
  tagline: null,
  logoUrl: null,
  faviconUrl: null,
  currency: "USD",
  defaultLocale: "en",
  khrExchangeRate: null,
  showKhrEquivalent: false,
  telegramUsername: null,
  messengerUrl: null,
  whatsappNumber: null,
  defaultChannel: "TELEGRAM",
  minOrderAmount: null,
  taxEnabled: false,
  taxRate: "0",
  taxLabel: "VAT",
  reservationHours: 48,
  deductStockOn: "CONFIRMED",
  lowStockThreshold: 5,
  contactEmail: null,
  contactPhone: null,
  address: null,
  socialLinks: {},
  footerText: null,
  shippingInfo: null,
  sizeGuide: null,
  announcementActive: false,
  announcementText: null,
  announcementHref: null,
  showCollections: true,
  translations: {},
  homepageSections: HOMEPAGE_SECTION_KEYS.map((key) => ({ key, enabled: true })),
  socialGallery: [],
};

/**
 * Store settings (singleton row): cached across requests (cleared on every admin save) and
 * memoised per request. Falls back to defaults if not seeded.
 */
export const getStoreSettings = cache(() => loadStoreSettings());

const loadStoreSettings = storefrontCache(async (): Promise<StoreSettingsDTO> => {
  const row = await prisma.storeSettings.findUnique({ where: { id: "default" } });
  if (!row) return DEFAULTS;
  const sections = sectionsSchema.parse(row.homepageSections);
  // Make sure every known section appears exactly once (new sections default to enabled).
  const known = new Set(sections.map((s) => s.key));
  const homepageSections = [...sections, ...HOMEPAGE_SECTION_KEYS.filter((k) => !known.has(k)).map((key) => ({ key, enabled: true }))];
  return {
    storeName: row.storeName,
    tagline: row.tagline,
    logoUrl: row.logoUrl,
    faviconUrl: row.faviconUrl,
    currency: row.currency,
    defaultLocale: row.defaultLocale,
    khrExchangeRate: row.khrExchangeRate?.toFixed(2) ?? null,
    showKhrEquivalent: row.showKhrEquivalent,
    telegramUsername: row.telegramUsername,
    messengerUrl: row.messengerUrl,
    whatsappNumber: row.whatsappNumber,
    defaultChannel: row.defaultChannel,
    minOrderAmount: row.minOrderAmount?.toFixed(2) ?? null,
    taxEnabled: row.taxEnabled,
    taxRate: row.taxRate.toFixed(2),
    taxLabel: row.taxLabel,
    reservationHours: row.reservationHours,
    deductStockOn: row.deductStockOn,
    lowStockThreshold: row.lowStockThreshold,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    address: row.address,
    socialLinks: socialLinksSchema.parse(row.socialLinks),
    footerText: row.footerText,
    shippingInfo: row.shippingInfo,
    sizeGuide: row.sizeGuide,
    announcementActive: row.announcementActive,
    announcementText: row.announcementText,
    announcementHref: row.announcementHref,
    showCollections: row.showCollections,
    translations: translatedTextSchema.parse(row.translations),
    homepageSections,
    socialGallery: gallerySchema.parse(row.socialGallery),
  };
}, "settings");

/** Pick a translated settings field, falling back to the base value. */
export function localizedSetting(
  settings: StoreSettingsDTO,
  field: "tagline" | "announcementText" | "footerText" | "shippingInfo" | "sizeGuide" | "address",
  locale: Locale,
): string | null {
  return settings.translations[locale]?.[field] || settings[field];
}

/** Settings safe to expose publicly (no internal inventory policy). */
export function toPublicSettings(s: StoreSettingsDTO) {
  return {
    storeName: s.storeName,
    tagline: s.tagline,
    logoUrl: s.logoUrl,
    currency: s.currency,
    defaultLocale: s.defaultLocale,
    khrExchangeRate: s.khrExchangeRate,
    showKhrEquivalent: s.showKhrEquivalent,
    telegramUsername: s.telegramUsername,
    messengerUrl: s.messengerUrl,
    whatsappNumber: s.whatsappNumber,
    defaultChannel: s.defaultChannel,
    minOrderAmount: s.minOrderAmount,
    taxEnabled: s.taxEnabled,
    taxRate: s.taxRate,
    taxLabel: s.taxLabel,
    contactEmail: s.contactEmail,
    contactPhone: s.contactPhone,
    address: s.address,
    socialLinks: s.socialLinks,
    footerText: s.footerText,
    shippingInfo: s.shippingInfo,
    sizeGuide: s.sizeGuide,
    announcementActive: s.announcementActive,
    announcementText: s.announcementText,
    announcementHref: s.announcementHref,
    showCollections: s.showCollections,
    translations: s.translations,
  };
}
export type PublicSettings = ReturnType<typeof toPublicSettings>;

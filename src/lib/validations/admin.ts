import { z } from "zod";
import { messengerFromFacebookUrl, telegramUsernameFromLink } from "@/lib/messaging/order-message";

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens",
  );

export const moneyString = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine(
    (v) => /^\d{1,9}(\.\d{1,2})?$/.test(v),
    "Enter a valid amount (e.g. 15 or 15.50)",
  );

export const optionalMoney = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) =>
    v === null || v === undefined || String(v).trim() === ""
      ? null
      : String(v).trim(),
  )
  .refine(
    (v) => v === null || /^\d{1,9}(\.\d{1,2})?$/.test(v),
    "Enter a valid amount",
  );

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

/** Image URL: our own uploads or https (Cloudinary / CDN). Never javascript:/data: URLs. */
export const imageUrlSchema = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (v) =>
      (/^\/(uploads|brand|logo)\/[\w\-./]+$/.test(v) && !v.includes("..")) ||
      /^https:\/\/[^\s]+$/.test(v),
    "Invalid image URL",
  );

export const optionalImageUrl = z
  .union([imageUrlSchema, z.literal(""), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

/** Internal links ("/shop?sale=1") or https URLs only. */
/** A required https link on one of the given sites (e.g. the shop's Facebook page). */
export function requiredSocialLink(hosts: string[], example: string) {
  const message = `Required — e.g. ${example}`;
  return z
    .union([z.string(), z.null()], { message })
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine((v) => v !== "", message)
    .refine((v) => {
      if (v === "") return true; // reported above
      try {
        const url = new URL(v);
        const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
        return url.protocol === "https:" && hosts.includes(host);
      } catch {
        return false;
      }
    }, `Use a link like ${example}`);
}

export const hrefSchema = z
  .union([z.string().trim().max(500), z.null()])
  .optional()
  .transform((v) => (v ? v : null))
  .refine(
    (v) =>
      v === null ||
      (v.startsWith("/") && !v.startsWith("//")) ||
      /^https:\/\/[^\s]+$/.test(v),
    "Use a relative path (/shop) or an https URL",
  );

const dateish = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Invalid date");

// ───────────────────────────── Products ─────────────────────────────

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    slug: z.union([slugSchema, z.literal("")]).optional(),
    sku: z
      .string()
      .trim()
      .min(2)
      .max(60)
      .regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, - and _ only"),
    shortDescription: optionalText(300),
    description: z.string().trim().min(1).max(10000),
    categoryId: z.string().uuid("Choose a category"),
    brand: optionalText(80),
    price: moneyString,
    salePrice: optionalMoney,
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
    isFeatured: z.boolean(),
    isNewArrival: z.boolean(),
    isBestSeller: z.boolean(),
    tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(30),
    lowStockThreshold: z.coerce.number().int().min(0).max(1000),
    condition: z
      .enum(["NEW_WITH_TAGS", "LIKE_NEW", "EXCELLENT", "GOOD", "FAIR"])
      .nullable()
      .default(null),
    translations: z
      .object({
        km: z.object({
          name: optionalText(160),
          shortDescription: optionalText(300),
          description: optionalText(10000),
        }),
      })
      .partial()
      .default({}),
    images: z
      .array(
        z.object({
          id: z.string().uuid().optional(),
          url: imageUrlSchema,
          storageKey: z.string().max(300).nullable().optional(),
          alt: optionalText(200),
          colorId: z.string().uuid().nullable().optional(),
        }),
      )
      .max(20),
    featuredImageIndex: z.coerce.number().int().min(0).default(0),
    variants: z
      .array(
        z.object({
          id: z.string().uuid().optional(),
          sizeId: z.string().uuid(),
          colorId: z.string().uuid(),
          sku: z
            .string()
            .trim()
            .min(2)
            .max(80)
            .regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, - and _ only"),
          priceOverride: optionalMoney,
          stock: z.coerce.number().int().min(0).max(1_000_000),
          isActive: z.boolean(),
        }),
      )
      .min(1, "Add at least one size/colour variant")
      .max(300),
    collectionIds: z.array(z.string().uuid()).max(50).default([]),
  })
  .superRefine((p, ctx) => {
    if (p.salePrice !== null && Number(p.salePrice) >= Number(p.price)) {
      ctx.addIssue({
        code: "custom",
        path: ["salePrice"],
        message: "Sale price must be lower than the regular price",
      });
    }
    const combos = new Set<string>();
    const skus = new Set<string>();
    p.variants.forEach((v, i) => {
      const key = `${v.sizeId}:${v.colorId}`;
      if (combos.has(key))
        ctx.addIssue({
          code: "custom",
          path: ["variants", i, "sizeId"],
          message: "Duplicate size/colour combination",
        });
      combos.add(key);
      const sku = v.sku.toUpperCase();
      if (skus.has(sku))
        ctx.addIssue({
          code: "custom",
          path: ["variants", i, "sku"],
          message: "Duplicate variant SKU",
        });
      skus.add(sku);
    });
  });
export type ProductInput = z.infer<typeof productInputSchema>;

// ───────────────────────────── Categories ─────────────────────────────

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: slugSchema,
  description: optionalText(1000),
  parentId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  imageUrl: optionalImageUrl,
  bannerUrl: optionalImageUrl,
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  nameKm: optionalText(80),
  descriptionKm: optionalText(1000),
});

export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

// ───────────────────────────── Orders ─────────────────────────────

export const ORDER_STATUSES = [
  "PENDING",
  "AWAITING_SELLER_CONFIRMATION",
  "CONFIRMED",
  "AWAITING_PAYMENT",
  "PAYMENT_RECEIVED",
  "PREPARING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
] as const;

export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: optionalText(1000),
  paymentNote: optionalText(500),
  trackingNumber: optionalText(100),
});

export const orderPatchSchema = z.object({
  internalNotes: optionalText(5000).optional(),
  trackingNumber: optionalText(100).optional(),
});

export const orderListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(ORDER_STATUSES).optional().catch(undefined),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  customer: z.string().uuid().optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10000).catch(1).default(1),
});

// ───────────────────────────── Inventory ─────────────────────────────

export const inventoryAdjustSchema = z.object({
  variantId: z.string().uuid(),
  delta: z.coerce
    .number()
    .int()
    .min(-100000)
    .max(100000)
    .refine((n) => n !== 0, "Adjustment cannot be zero"),
  reason: z.string().trim().min(3, "Give a reason for the adjustment").max(300),
});

// ───────────────────────────── Promotions ─────────────────────────────

const discountBase = {
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: moneyString,
  scope: z.enum(["ALL", "CATEGORY", "PRODUCT"]).default("ALL"),
  categoryIds: z.array(z.string().uuid()).max(200).default([]),
  productIds: z.array(z.string().uuid()).max(500).default([]),
  isActive: z.boolean().default(true),
};

function checkDiscount(
  d: {
    type: string;
    value: string;
    scope: string;
    categoryIds: string[];
    productIds: string[];
  },
  ctx: z.RefinementCtx,
) {
  if (
    d.type === "PERCENTAGE" &&
    (Number(d.value) <= 0 || Number(d.value) > 100)
  )
    ctx.addIssue({
      code: "custom",
      path: ["value"],
      message: "Percentage must be between 0 and 100",
    });
  if (d.type === "FIXED" && Number(d.value) <= 0)
    ctx.addIssue({
      code: "custom",
      path: ["value"],
      message: "Amount must be greater than 0",
    });
  if (d.scope === "CATEGORY" && d.categoryIds.length === 0)
    ctx.addIssue({
      code: "custom",
      path: ["categoryIds"],
      message: "Choose at least one category",
    });
  if (d.scope === "PRODUCT" && d.productIds.length === 0)
    ctx.addIssue({
      code: "custom",
      path: ["productIds"],
      message: "Choose at least one product",
    });
}

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(40)
      .regex(/^[A-Z0-9_-]+$/, "Letters, numbers, - and _ only"),
    description: optionalText(300),
    ...discountBase,
    minOrderAmount: optionalMoney,
    maxDiscount: optionalMoney,
    startsAt: dateish,
    expiresAt: dateish,
    usageLimit: z
      .union([
        z.coerce.number().int().min(1).max(10_000_000),
        z.literal(""),
        z.null(),
      ])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
  })
  .superRefine((c, ctx) => {
    checkDiscount(c, ctx);
    if (c.startsAt && c.expiresAt && c.expiresAt <= c.startsAt)
      ctx.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "Expiry must be after the start date",
      });
  });

export const promotionInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    ...discountBase,
    startsAt: dateish,
    endsAt: dateish,
  })
  .superRefine((p, ctx) => {
    checkDiscount(p, ctx);
    if (p.startsAt && p.endsAt && p.endsAt <= p.startsAt)
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End must be after the start date",
      });
  });

// ───────────────────────────── Content ─────────────────────────────

const kmTranslation = z
  .record(z.string(), z.string().max(2000))
  .optional()
  .default({})
  .transform((r) =>
    Object.fromEntries(Object.entries(r).filter(([, v]) => v.trim() !== "")),
  );

export const bannerInputSchema = z.object({
  placement: z.enum(["HERO", "PROMO", "EDITORIAL"]),
  title: z.string().trim().min(1).max(160),
  subtitle: optionalText(160),
  description: optionalText(600),
  ctaLabel: optionalText(60),
  ctaHref: hrefSchema,
  secondaryCtaLabel: optionalText(60),
  secondaryCtaHref: hrefSchema,
  imageUrl: imageUrlSchema,
  mobileImageUrl: optionalImageUrl,
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
  startsAt: dateish,
  endsAt: dateish,
  km: kmTranslation,
});

export const collectionInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
  description: optionalText(1000),
  imageUrl: optionalImageUrl,
  bannerUrl: optionalImageUrl,
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  productIds: z.array(z.string().uuid()).max(500).default([]),
  km: kmTranslation,
});

export const deliveryMethodInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: optionalText(300),
  fee: moneyString,
  freeOverAmount: optionalMoney,
  estimatedDays: optionalText(60),
  isPickup: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  nameKm: optionalText(100),
  estimatedDaysKm: optionalText(60),
});

export const sizeInputSchema = z.object({
  name: z.string().trim().min(1).max(20),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  nameKm: optionalText(40),
});
export const colorInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  hex: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex colour like #A67C52"),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  nameKm: optionalText(40),
});

const SECTION_KEYS = [
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

export const settingsInputSchema = z
  .object({
    storeName: z.string().trim().min(1).max(60),
    tagline: optionalText(160),
    logoUrl: optionalImageUrl,
    faviconUrl: optionalImageUrl,
    currency: z.enum(["USD", "KHR"]),
    defaultLocale: z.enum(["en", "km"]),
    khrExchangeRate: optionalMoney,
    showKhrEquivalent: z.boolean(),
    telegramUsername: z
      .union([z.string().trim().max(64), z.null()])
      .optional()
      .transform((v) =>
        v ? v.replace(/^@/, "").replace(/^https?:\/\/t\.me\//i, "") : null,
      )
      .refine(
        (v) => v === null || /^[A-Za-z0-9_]{5,32}$/.test(v),
        "Telegram usernames are 5–32 letters, numbers or _",
      ),
    messengerUrl: z
      .union([z.string().trim().max(300), z.null()])
      .optional()
      .transform((v) => (v ? v : null))
      .refine(
        (v) =>
          v === null ||
          /^https:\/\/(www\.)?(m\.me|messenger\.com|facebook\.com|m\.facebook\.com)\//.test(
            v,
          ),
        "Use an https://m.me/… link",
      ),
    whatsappNumber: z
      .union([z.string().trim().max(30), z.null()])
      .optional()
      .transform((v) => (v ? v.replace(/\D/g, "") : null))
      .refine(
        (v) => v === null || (v.length >= 8 && v.length <= 15),
        "International format without +, e.g. 85512345678",
      ),
    defaultChannel: z.enum(["TELEGRAM", "WHATSAPP", "MESSENGER"]),
    minOrderAmount: optionalMoney,
    taxEnabled: z.boolean(),
    taxRate: moneyString.refine((v) => Number(v) <= 100, "Max 100%"),
    taxLabel: z.string().trim().min(1).max(20),
    reservationHours: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 30),
    deductStockOn: z.enum(["CONFIRMED", "PAYMENT_RECEIVED", "SHIPPED"]),
    lowStockThreshold: z.coerce.number().int().min(0).max(1000),
    contactEmail: z
      .union([z.string().trim().email(), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v ? v : null)),
    contactPhone: optionalText(40),
    address: optionalText(300),
    // Facebook and Telegram are how most customers in Cambodia reach the shop: required.
    socialLinks: z.object({
      facebook: requiredSocialLink(
        ["facebook.com", "fb.com", "me"],
        "https://facebook.com/yourpage",
      ),
      telegram: requiredSocialLink(
        ["t.me", "telegram.me"],
        "https://t.me/yourshop",
      ),
      instagram: hrefSchema,
      tiktok: hrefSchema,
      youtube: hrefSchema,
    }),
    footerText: optionalText(500),
    shippingInfo: optionalText(5000),
    sizeGuide: optionalText(5000),
    announcementActive: z.boolean(),
    showCollections: z.boolean(),
    announcementText: optionalText(200),
    announcementHref: hrefSchema,
    translations: z
      .object({ km: z.record(z.string(), z.string().max(5000)).default({}) })
      .default({ km: {} }),
    homepageSections: z
      .array(z.object({ key: z.enum(SECTION_KEYS), enabled: z.boolean() }))
      .max(20),
    socialGallery: z
      .array(z.object({ imageUrl: imageUrlSchema, href: hrefSchema }))
      .max(12),
  })
  .superRefine((s, ctx) => {
    const configured = {
      // Same fallback as the storefront: the Contact & social links count as configured accounts.
      TELEGRAM: s.telegramUsername || telegramUsernameFromLink(s.socialLinks.telegram),
      MESSENGER: s.messengerUrl || messengerFromFacebookUrl(s.socialLinks.facebook),
      WHATSAPP: s.whatsappNumber,
    };
    const anySet = Object.values(configured).some(Boolean);
    if (anySet && !configured[s.defaultChannel]) {
      ctx.addIssue({
        code: "custom",
        path: ["defaultChannel"],
        message:
          "The default channel has no account set. Choose Telegram or Messenger, or fill in that channel.",
      });
    }
  });

/** Quick edit from the product list: the fields a seller changes most, nothing structural. */
export const productQuickEditSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(160),
    nameKm: optionalText(160),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
    price: moneyString,
    salePrice: optionalMoney,
    isFeatured: z.boolean(),
    isNewArrival: z.boolean(),
    isBestSeller: z.boolean(),
    variants: z
      .array(
        z.object({
          id: z.string().uuid(),
          stock: z.coerce.number().int().min(0).max(1_000_000),
          isActive: z.boolean(),
        }),
      )
      .max(300),
  })
  .superRefine((p, ctx) => {
    if (Number(p.price) <= 0)
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message: "Price must be greater than 0",
      });
    if (p.salePrice !== null && Number(p.salePrice) >= Number(p.price)) {
      ctx.addIssue({
        code: "custom",
        path: ["salePrice"],
        message: "Sale price must be lower than the regular price",
      });
    }
  });
export type ProductQuickEditInput = z.infer<typeof productQuickEditSchema>;

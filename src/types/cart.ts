export type CartLineIssue = "UNAVAILABLE" | "OUT_OF_STOCK" | "INSUFFICIENT";

export type QuotedLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  sku: string;
  sizeName: string;
  colorName: string;
  colorHex: string;
  unitCents: number;
  compareAtCents: number | null;
  /** Quantity the customer asked for. */
  quantity: number;
  /** Units currently available to order. */
  available: number;
  lineTotalCents: number;
  issue: CartLineIssue | null;
};

export type CouponStatus = {
  code: string;
  ok: boolean;
  reason: "INVALID" | "INACTIVE" | "NOT_STARTED" | "EXPIRED" | "USAGE_LIMIT" | "MIN_ORDER" | "NOT_APPLICABLE" | null;
  minOrderCents?: number;
};

export type CartQuote = {
  currency: string;
  lines: QuotedLine[];
  subtotalCents: number;
  discountCents: number;
  deliveryCents: number;
  taxCents: number;
  grandTotalCents: number;
  coupon: CouponStatus | null;
  deliveryMethodId: string | null;
  minOrderCents: number | null;
  hasIssues: boolean;
};

/** Display snapshot stored with each local cart item for instant rendering before a server quote. */
export type CartItemMeta = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  sizeName: string;
  colorName: string;
  colorHex: string;
  unitCents: number;
  compareAtCents: number | null;
  available: number;
};

export type LocalCartItem = { variantId: string; quantity: number; meta: CartItemMeta };

/**
 * Pure, isomorphic pricing engine. No database or framework imports so it can
 * be unit tested and reused for instant client display. The server always
 * re-runs it with fresh database data before persisting anything.
 */
import { percentOf, toCents, type Cents } from "@/lib/money";

export type DiscountKind = "PERCENTAGE" | "FIXED";
export type DiscountScopeKind = "ALL" | "CATEGORY" | "PRODUCT";

export interface PromotionRule {
  id: string;
  name: string;
  type: DiscountKind;
  /** Percent ("10") or fixed amount ("5.00"). */
  value: string;
  scope: DiscountScopeKind;
  categoryIds: string[];
  productIds: string[];
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  isActive: boolean;
}

export interface CouponRule {
  id: string;
  code: string;
  type: DiscountKind;
  value: string;
  scope: DiscountScopeKind;
  categoryIds: string[];
  productIds: string[];
  minOrderAmount: string | null;
  maxDiscount: string | null;
  startsAt: Date | string | null;
  expiresAt: Date | string | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
}

export interface DeliveryRule {
  id: string;
  name: string;
  fee: string;
  freeOverAmount: string | null;
}

export interface TaxRule {
  enabled: boolean;
  /** Percent, e.g. "10". */
  rate: string;
}

export interface ProductPriceInput {
  productId: string;
  /** The product's category and all of its ancestors. */
  categoryIds: string[];
  price: string;
  salePrice: string | null;
  variantPriceOverride: string | null;
}

export interface UnitPrice {
  unitCents: Cents;
  /** Original price to show struck through, when the customer pays less. */
  compareAtCents: Cents | null;
  promotionId: string | null;
}

const toDate = (d: Date | string | null): Date | null => (d === null ? null : d instanceof Date ? d : new Date(d));

export function isWithinWindow(now: Date, start: Date | string | null, end: Date | string | null): boolean {
  const s = toDate(start);
  const e = toDate(end);
  if (s && now < s) return false;
  if (e && now > e) return false;
  return true;
}

function ruleMatchesProduct(
  rule: { scope: DiscountScopeKind; categoryIds: string[]; productIds: string[] },
  productId: string,
  categoryIds: string[],
): boolean {
  if (rule.scope === "ALL") return true;
  if (rule.scope === "PRODUCT") return rule.productIds.includes(productId);
  return categoryIds.some((c) => rule.categoryIds.includes(c));
}

function discountAmount(type: DiscountKind, value: string, baseCents: Cents): Cents {
  const raw = type === "PERCENTAGE" ? percentOf(baseCents, value) : toCents(value);
  return Math.max(0, Math.min(raw, baseCents));
}

/**
 * Effective unit price for a product/variant:
 *   regular = variant override ?? product price
 *   current = product sale price (only when there is no variant override and it is lower)
 *   final   = current minus the single best active automatic promotion
 */
export function computeUnitPrice(input: ProductPriceInput, promotions: PromotionRule[], now: Date = new Date()): UnitPrice {
  const regular = input.variantPriceOverride !== null ? toCents(input.variantPriceOverride) : toCents(input.price);
  let current = regular;
  if (input.variantPriceOverride === null && input.salePrice !== null) {
    const sale = toCents(input.salePrice);
    if (sale > 0 && sale < regular) current = sale;
  }

  let bestDiscount = 0;
  let promotionId: string | null = null;
  for (const promo of promotions) {
    if (!promo.isActive || !isWithinWindow(now, promo.startsAt, promo.endsAt)) continue;
    if (!ruleMatchesProduct(promo, input.productId, input.categoryIds)) continue;
    const d = discountAmount(promo.type, promo.value, current);
    if (d > bestDiscount) {
      bestDiscount = d;
      promotionId = promo.id;
    }
  }

  const unitCents = current - bestDiscount;
  return { unitCents, compareAtCents: unitCents < regular ? regular : null, promotionId };
}

export function discountPercent(unitCents: Cents, compareAtCents: Cents | null): number | null {
  if (!compareAtCents || compareAtCents <= 0 || unitCents >= compareAtCents) return null;
  return Math.round(((compareAtCents - unitCents) / compareAtCents) * 100);
}

// ───────────────────────────── Cart totals ─────────────────────────────

export interface PricedLineInput {
  productId: string;
  categoryIds: string[];
  unitCents: Cents;
  quantity: number;
}

export type CouponFailure =
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "USAGE_LIMIT"
  | "MIN_ORDER"
  | "NOT_APPLICABLE";

export type CouponEvaluation =
  | { ok: true; discountCents: Cents }
  | { ok: false; reason: CouponFailure; minOrderCents?: Cents };

export function lineTotal(line: { unitCents: Cents; quantity: number }): Cents {
  return line.unitCents * line.quantity;
}

export function computeSubtotal(lines: { unitCents: Cents; quantity: number }[]): Cents {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}

export function evaluateCoupon(coupon: CouponRule, lines: PricedLineInput[], now: Date = new Date()): CouponEvaluation {
  if (!coupon.isActive) return { ok: false, reason: "INACTIVE" };
  const start = toDate(coupon.startsAt);
  const end = toDate(coupon.expiresAt);
  if (start && now < start) return { ok: false, reason: "NOT_STARTED" };
  if (end && now > end) return { ok: false, reason: "EXPIRED" };
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) return { ok: false, reason: "USAGE_LIMIT" };

  const subtotal = computeSubtotal(lines);
  if (coupon.minOrderAmount !== null) {
    const min = toCents(coupon.minOrderAmount);
    if (subtotal < min) return { ok: false, reason: "MIN_ORDER", minOrderCents: min };
  }

  const eligible = computeSubtotal(lines.filter((l) => ruleMatchesProduct(coupon, l.productId, l.categoryIds)));
  if (eligible <= 0) return { ok: false, reason: "NOT_APPLICABLE" };

  let discount = discountAmount(coupon.type, coupon.value, eligible);
  if (coupon.type === "PERCENTAGE" && coupon.maxDiscount !== null) {
    discount = Math.min(discount, toCents(coupon.maxDiscount));
  }
  return { ok: true, discountCents: discount };
}

export function computeDeliveryFee(method: DeliveryRule | null, merchandiseCents: Cents): Cents {
  if (!method) return 0;
  if (method.freeOverAmount !== null && merchandiseCents >= toCents(method.freeOverAmount)) return 0;
  return toCents(method.fee);
}

export function computeTax(tax: TaxRule | null, taxableCents: Cents): Cents {
  if (!tax || !tax.enabled) return 0;
  return percentOf(Math.max(0, taxableCents), tax.rate);
}

export interface CartTotals {
  subtotalCents: Cents;
  discountCents: Cents;
  deliveryCents: Cents;
  taxCents: Cents;
  grandTotalCents: Cents;
  coupon: CouponEvaluation | null;
}

/**
 * Grand Total = Subtotal − Discount + Delivery Fee (+ Tax when enabled).
 */
export function computeCartTotals(params: {
  lines: PricedLineInput[];
  coupon?: CouponRule | null;
  delivery?: DeliveryRule | null;
  tax?: TaxRule | null;
  now?: Date;
}): CartTotals {
  const now = params.now ?? new Date();
  const subtotalCents = computeSubtotal(params.lines);
  const coupon = params.coupon ? evaluateCoupon(params.coupon, params.lines, now) : null;
  const discountCents = coupon && coupon.ok ? Math.min(coupon.discountCents, subtotalCents) : 0;
  const merchandise = subtotalCents - discountCents;
  const deliveryCents = computeDeliveryFee(params.delivery ?? null, merchandise);
  const taxCents = computeTax(params.tax ?? null, merchandise);
  return {
    subtotalCents,
    discountCents,
    deliveryCents,
    taxCents,
    grandTotalCents: merchandise + deliveryCents + taxCents,
    coupon,
  };
}

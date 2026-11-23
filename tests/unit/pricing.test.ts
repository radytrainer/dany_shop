import { describe, expect, it } from "vitest";
import { formatMoney, fromCents, percentOf, toCents } from "@/lib/money";
import {
  computeCartTotals,
  computeDeliveryFee,
  computeTax,
  computeUnitPrice,
  discountPercent,
  evaluateCoupon,
  type CouponRule,
  type PromotionRule,
} from "@/lib/calculations/pricing";

const NOW = new Date("2026-06-15T12:00:00Z");

const coupon = (over: Partial<CouponRule> = {}): CouponRule => ({
  id: "c1",
  code: "TEST",
  type: "PERCENTAGE",
  value: "10",
  scope: "ALL",
  categoryIds: [],
  productIds: [],
  minOrderAmount: null,
  maxDiscount: null,
  startsAt: null,
  expiresAt: null,
  usageLimit: null,
  usageCount: 0,
  isActive: true,
  ...over,
});

const promo = (over: Partial<PromotionRule> = {}): PromotionRule => ({
  id: "p1",
  name: "Promo",
  type: "PERCENTAGE",
  value: "10",
  scope: "ALL",
  categoryIds: [],
  productIds: [],
  startsAt: null,
  endsAt: null,
  isActive: true,
  ...over,
});

describe("money", () => {
  it("parses decimal strings to integer cents without float error", () => {
    expect(toCents("15")).toBe(1500);
    expect(toCents("0.1")).toBe(10);
    expect(toCents("19.99")).toBe(1999);
    expect(toCents("1.005")).toBe(101);
    expect(toCents("-3.25")).toBe(-325);
    expect(toCents({ toFixed: () => "12.30" })).toBe(1230);
  });

  it("rejects malformed values", () => {
    expect(() => toCents("12,50")).toThrow();
    expect(() => toCents("abc")).toThrow();
  });

  it("round-trips cents to decimal strings", () => {
    expect(fromCents(5200)).toBe("52.00");
    expect(fromCents(5)).toBe("0.05");
    expect(fromCents(-150)).toBe("-1.50");
  });

  it("computes percentages with integer math", () => {
    expect(percentOf(5500, "10")).toBe(550);
    expect(percentOf(999, "12.5")).toBe(125);
  });

  it("formats USD and KHR", () => {
    expect(formatMoney(5200, "USD")).toBe("$52.00");
    expect(formatMoney(4100000, "KHR")).toBe("41,000៛");
    // Same output in Khmer (no ICU-dependent formatting → no hydration mismatches)
    expect(formatMoney(5500, "USD", "km")).toBe("$55.00");
    expect(formatMoney(123456789, "USD", "km")).toBe("$1,234,567.89");
    expect(formatMoney(-150, "USD")).toBe("-$1.50");
  });
});

describe("unit price", () => {
  const base = { productId: "prod", categoryIds: ["cat"], price: "25", salePrice: null, variantPriceOverride: null };

  it("uses the regular price", () => {
    expect(computeUnitPrice(base, [], NOW)).toEqual({ unitCents: 2500, compareAtCents: null, promotionId: null });
  });

  it("applies a lower sale price", () => {
    expect(computeUnitPrice({ ...base, salePrice: "20" }, [], NOW)).toMatchObject({ unitCents: 2000, compareAtCents: 2500 });
  });

  it("ignores a sale price that is not lower", () => {
    expect(computeUnitPrice({ ...base, salePrice: "30" }, [], NOW).unitCents).toBe(2500);
  });

  it("variant override replaces price and ignores product sale price", () => {
    expect(computeUnitPrice({ ...base, salePrice: "20", variantPriceOverride: "28" }, [], NOW)).toMatchObject({
      unitCents: 2800,
      compareAtCents: null,
    });
  });

  it("applies the single best matching promotion", () => {
    const promos = [
      promo({ id: "a", value: "10" }),
      promo({ id: "b", type: "FIXED", value: "5", scope: "CATEGORY", categoryIds: ["cat"] }),
      promo({ id: "c", value: "50", scope: "PRODUCT", productIds: ["other"] }),
    ];
    expect(computeUnitPrice(base, promos, NOW)).toMatchObject({ unitCents: 2000, compareAtCents: 2500, promotionId: "b" });
  });

  it("skips inactive and out-of-window promotions", () => {
    const promos = [
      promo({ isActive: false }),
      promo({ endsAt: new Date("2026-01-01") }),
      promo({ startsAt: new Date("2027-01-01") }),
    ];
    expect(computeUnitPrice(base, promos, NOW).unitCents).toBe(2500);
  });

  it("never goes below zero", () => {
    expect(computeUnitPrice(base, [promo({ type: "FIXED", value: "100" })], NOW).unitCents).toBe(0);
  });

  it("computes discount percent for badges", () => {
    expect(discountPercent(2000, 2500)).toBe(20);
    expect(discountPercent(2500, null)).toBeNull();
  });
});

describe("coupons", () => {
  const lines = [
    { productId: "a", categoryIds: ["tops"], unitCents: 1500, quantity: 2 },
    { productId: "b", categoryIds: ["pants"], unitCents: 2500, quantity: 1 },
  ];

  it("percentage coupon on the whole order", () => {
    expect(evaluateCoupon(coupon({ value: "10" }), lines, NOW)).toEqual({ ok: true, discountCents: 550 });
  });

  it("caps percentage coupons at maxDiscount", () => {
    expect(evaluateCoupon(coupon({ value: "50", maxDiscount: "10" }), lines, NOW)).toEqual({ ok: true, discountCents: 1000 });
  });

  it("fixed coupon", () => {
    expect(evaluateCoupon(coupon({ type: "FIXED", value: "5" }), lines, NOW)).toEqual({ ok: true, discountCents: 500 });
  });

  it("scopes to categories", () => {
    expect(evaluateCoupon(coupon({ scope: "CATEGORY", categoryIds: ["pants"], value: "20" }), lines, NOW)).toEqual({
      ok: true,
      discountCents: 500,
    });
  });

  it("rejects when no items are eligible", () => {
    expect(evaluateCoupon(coupon({ scope: "PRODUCT", productIds: ["zzz"] }), lines, NOW)).toEqual({ ok: false, reason: "NOT_APPLICABLE" });
  });

  it("rejects expired, future, inactive and exhausted coupons", () => {
    expect(evaluateCoupon(coupon({ expiresAt: new Date("2026-01-01") }), lines, NOW)).toMatchObject({ reason: "EXPIRED" });
    expect(evaluateCoupon(coupon({ startsAt: new Date("2027-01-01") }), lines, NOW)).toMatchObject({ reason: "NOT_STARTED" });
    expect(evaluateCoupon(coupon({ isActive: false }), lines, NOW)).toMatchObject({ reason: "INACTIVE" });
    expect(evaluateCoupon(coupon({ usageLimit: 3, usageCount: 3 }), lines, NOW)).toMatchObject({ reason: "USAGE_LIMIT" });
  });

  it("enforces minimum order amount", () => {
    expect(evaluateCoupon(coupon({ minOrderAmount: "100" }), lines, NOW)).toEqual({ ok: false, reason: "MIN_ORDER", minOrderCents: 10000 });
  });
});

describe("delivery and tax", () => {
  const method = { id: "d", name: "PP", fee: "2.00", freeOverAmount: "50.00" };
  it("charges the configured fee", () => expect(computeDeliveryFee(method, 4999)).toBe(200));
  it("is free over the threshold", () => expect(computeDeliveryFee(method, 5000)).toBe(0));
  it("is zero with no method", () => expect(computeDeliveryFee(null, 1000)).toBe(0));
  it("computes tax only when enabled", () => {
    expect(computeTax({ enabled: false, rate: "10" }, 1000)).toBe(0);
    expect(computeTax({ enabled: true, rate: "10" }, 1000)).toBe(100);
  });
});

describe("cart totals — specification example", () => {
  it("Subtotal $55, Discount $5, Delivery $2 → Grand Total $52", () => {
    const totals = computeCartTotals({
      lines: [
        { productId: "A", categoryIds: [], unitCents: 1500, quantity: 2 },
        { productId: "B", categoryIds: [], unitCents: 2500, quantity: 1 },
      ],
      coupon: coupon({ type: "FIXED", value: "5" }),
      delivery: { id: "d", name: "PP", fee: "2", freeOverAmount: null },
      now: NOW,
    });
    expect(totals).toMatchObject({ subtotalCents: 5500, discountCents: 500, deliveryCents: 200, taxCents: 0, grandTotalCents: 5200 });
  });

  it("ignores an invalid coupon in totals but reports why", () => {
    const totals = computeCartTotals({
      lines: [{ productId: "A", categoryIds: [], unitCents: 1000, quantity: 1 }],
      coupon: coupon({ minOrderAmount: "50" }),
      now: NOW,
    });
    expect(totals.discountCents).toBe(0);
    expect(totals.coupon).toMatchObject({ ok: false, reason: "MIN_ORDER" });
  });

  it("includes tax on discounted merchandise", () => {
    const totals = computeCartTotals({
      lines: [{ productId: "A", categoryIds: [], unitCents: 10000, quantity: 1 }],
      coupon: coupon({ value: "10" }),
      tax: { enabled: true, rate: "10" },
      now: NOW,
    });
    expect(totals).toMatchObject({ subtotalCents: 10000, discountCents: 1000, taxCents: 900, grandTotalCents: 9900 });
  });
});

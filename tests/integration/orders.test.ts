import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createOrder, buildSellerMessaging, getAccessibleOrder } from "@/services/orders";
import { updateOrderStatus } from "@/services/admin-orders";
import { priceCart } from "@/services/cart";
import { releaseExpiredReservations } from "@/services/inventory";
import { checkoutSchema } from "@/lib/validations/checkout";
import { customer, resetDb, seedFixtures, type Fixtures } from "../support/fixtures";

let fx: Fixtures;

beforeEach(async () => {
  await resetDb();
  fx = await seedFixtures();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const checkout = (over: Record<string, unknown> = {}) =>
  checkoutSchema.parse({
    items: [{ variantId: fx.medium.id, quantity: 2 }],
    deliveryMethodId: fx.delivery.id,
    contactChannel: "TELEGRAM",
    customer,
    ...over,
  });

const variant = (id: string) => prisma.productVariant.findUniqueOrThrow({ where: { id } });

describe("cart pricing (server)", () => {
  it("uses database prices and reports availability", async () => {
    const q = await priceCart({ items: [{ variantId: fx.small.id, quantity: 5 }], deliveryMethodId: fx.delivery.id });
    expect(q.lines[0]).toMatchObject({ unitCents: 2000, compareAtCents: 2500, available: 2, issue: "INSUFFICIENT" });
    expect(q.subtotalCents).toBe(4000); // clamped to available units
    expect(q.deliveryCents).toBe(200);
  });

  it("rejects an expired coupon", async () => {
    const q = await priceCart({ items: [{ variantId: fx.medium.id, quantity: 1 }], couponCode: "OLD10" });
    expect(q.coupon).toMatchObject({ ok: false, reason: "EXPIRED" });
    expect(q.discountCents).toBe(0);
  });

  it("reports an unknown coupon as invalid", async () => {
    const q = await priceCart({ items: [{ variantId: fx.medium.id, quantity: 1 }], couponCode: "NOPE" });
    expect(q.coupon).toMatchObject({ ok: false, reason: "INVALID" });
  });
});

describe("order creation", () => {
  it("persists the order with snapshots, server totals and a stock reservation", async () => {
    const created = await createOrder(checkout({ couponCode: "SAVE5" }), { userId: null, locale: "en" });
    expect(created.orderNumber).toMatch(/^ORD-\d{4}-00001$/);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: created.id }, include: { items: true, statusHistory: true } });
    expect(order.status).toBe("PENDING");
    expect(order.paymentStatus).toBe("UNPAID");
    expect(order.subtotal.toFixed(2)).toBe("40.00");
    expect(order.discountTotal.toFixed(2)).toBe("5.00");
    expect(order.deliveryFee.toFixed(2)).toBe("2.00");
    expect(order.grandTotal.toFixed(2)).toBe("37.00");
    expect(order.items[0]).toMatchObject({ productName: "Test Dress", sizeName: "M", colorName: "Black", quantity: 2, sku: "T-DRESS-BLK-M" });
    expect(order.items[0].unitPrice.toFixed(2)).toBe("20.00");
    expect(order.statusHistory).toHaveLength(1);

    expect(await variant(fx.medium.id)).toMatchObject({ stock: 10, reserved: 2 });
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: fx.coupon.id } })).usageCount).toBe(1);
    expect(await prisma.inventoryMovement.count({ where: { orderId: created.id, type: "RESERVE" } })).toBe(1);
  });

  it("keeps the original price after the product price changes", async () => {
    const created = await createOrder(checkout(), { userId: null, locale: "en" });
    await prisma.product.update({ where: { id: fx.product.id }, data: { price: "99", salePrice: null } });
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: created.id } });
    expect(item.unitPrice.toFixed(2)).toBe("20.00");
  });

  it("rejects insufficient stock and rolls back completely", async () => {
    await expect(createOrder(checkout({ items: [{ variantId: fx.small.id, quantity: 3 }] }), { userId: null, locale: "en" })).rejects.toMatchObject({ code: "STOCK_CHANGED" });
    expect(await prisma.order.count()).toBe(0);
    expect(await variant(fx.small.id)).toMatchObject({ stock: 2, reserved: 0 });
  });

  it("prevents overselling under concurrent checkouts", async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 4 }, () => createOrder(checkout({ items: [{ variantId: fx.small.id, quantity: 1 }] }), { userId: null, locale: "en" })),
    );
    const ok = attempts.filter((a) => a.status === "fulfilled");
    expect(ok).toHaveLength(2);
    expect(await variant(fx.small.id)).toMatchObject({ stock: 2, reserved: 2 });
  });

  it("enforces coupon usage limits", async () => {
    await createOrder(checkout({ couponCode: "SAVE5" }), { userId: null, locale: "en" });
    await expect(createOrder(checkout({ couponCode: "SAVE5" }), { userId: null, locale: "en" })).rejects.toMatchObject({ code: "COUPON_INVALID" });
  });

  it("refuses draft/unpublished products", async () => {
    const draftVariant = await prisma.productVariant.create({ data: { productId: fx.draft.id, sku: "D-1", sizeId: fx.small.sizeId, colorId: fx.small.colorId, stock: 5 } });
    await expect(createOrder(checkout({ items: [{ variantId: draftVariant.id, quantity: 1 }] }), { userId: null, locale: "en" })).rejects.toMatchObject({ code: "STOCK_CHANGED" });
  });

  it("validates customer data", () => {
    expect(() => checkout({ customer: { ...customer, phone: "abc" } })).toThrow();
    expect(() => checkout({ items: [] })).toThrow();
  });

  it("grants order access only with the token or to the owner", async () => {
    const created = await createOrder(checkout(), { userId: fx.customer.id, locale: "en" });
    expect(await getAccessibleOrder(created.orderNumber, { token: created.accessToken })).not.toBeNull();
    expect(await getAccessibleOrder(created.orderNumber, { token: "wrong-token-value" })).toBeNull();
    expect(await getAccessibleOrder(created.orderNumber, { userId: fx.customer.id })).not.toBeNull();
    expect(await getAccessibleOrder(created.orderNumber, { userId: fx.admin.id })).toBeNull();
    expect(await getAccessibleOrder(created.orderNumber, { isStaff: true })).not.toBeNull();
  });

  it("generates messaging links containing the saved order details", async () => {
    const created = await createOrder(checkout(), { userId: null, locale: "en" });
    const order = (await getAccessibleOrder(created.orderNumber, { token: created.accessToken }))!;
    const { message, links } = await buildSellerMessaging(order);
    expect(message).toContain(created.orderNumber);
    expect(message).toContain("Size: M");
    expect(message).toContain("TOTAL: $42.00");
    expect(links.TELEGRAM).toMatch(/^https:\/\/t\.me\/test_seller\?text=/);
    expect(decodeURIComponent(links.TELEGRAM!.split("?text=")[1])).toBe(message);
    expect(links.WHATSAPP).toMatch(/^https:\/\/wa\.me\/85512345678\?text=/);
    expect(links.MESSENGER).toBeNull();
  });
});

describe("inventory lifecycle", () => {
  it("deducts on confirmation, restocks on cancellation and returns the coupon use", async () => {
    const created = await createOrder(checkout({ couponCode: "SAVE5" }), { userId: null, locale: "en" });
    await updateOrderStatus(created.id, { status: "CONFIRMED", note: null, paymentNote: null, trackingNumber: null }, { id: fx.admin.id });
    expect(await variant(fx.medium.id)).toMatchObject({ stock: 8, reserved: 0 });

    await updateOrderStatus(created.id, { status: "PAYMENT_RECEIVED", note: null, paymentNote: "ABA ref 42", trackingNumber: null }, { id: fx.admin.id });
    const paid = await prisma.order.findUniqueOrThrow({ where: { id: created.id } });
    expect(paid).toMatchObject({ paymentStatus: "PAID", paymentNote: "ABA ref 42" });

    await updateOrderStatus(created.id, { status: "CANCELLED", note: null, paymentNote: null, trackingNumber: null }, { id: fx.admin.id });
    expect(await variant(fx.medium.id)).toMatchObject({ stock: 10, reserved: 0 });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: created.id } })).stockState).toBe("RESTOCKED");
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: fx.coupon.id } })).usageCount).toBe(0);
  });

  it("rejects invalid status transitions", async () => {
    const created = await createOrder(checkout(), { userId: null, locale: "en" });
    await expect(updateOrderStatus(created.id, { status: "COMPLETED", note: null, paymentNote: null, trackingNumber: null }, { id: fx.admin.id })).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
  });

  it("releases expired reservations and re-reserves when confirmed later", async () => {
    const created = await createOrder(checkout(), { userId: null, locale: "en" });
    await prisma.order.update({ where: { id: created.id }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    expect(await releaseExpiredReservations()).toBe(1);
    expect(await variant(fx.medium.id)).toMatchObject({ stock: 10, reserved: 0 });
    // Confirming later deducts from currently available stock.
    await updateOrderStatus(created.id, { status: "CONFIRMED", note: null, paymentNote: null, trackingNumber: null }, { id: fx.admin.id });
    expect(await variant(fx.medium.id)).toMatchObject({ stock: 8, reserved: 0 });
  });
});

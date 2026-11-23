import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { buildProductQuery } from "@/lib/validations/catalog";
import { getProductBySlug, getVisibleCategoryIds, listProducts } from "@/services/catalog";
import { priceCart } from "@/services/cart";
import { createOrder } from "@/services/orders";
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

describe("hidden categories", () => {
  it("hides products whose parent category is inactive, and restores them when re-activated", async () => {
    // Deactivating the parent ("Women") hides products in its subcategory ("Dresses").
    await prisma.category.update({ where: { id: fx.women.id }, data: { isActive: false } });
    expect(await getVisibleCategoryIds()).not.toContain(fx.dresses.id);
    expect((await listProducts(buildProductQuery(), "en")).total).toBe(0);
    expect(await getProductBySlug("test-dress", "en")).toBeNull();

    // Cannot be ordered either.
    const quote = await priceCart({ items: [{ variantId: fx.medium.id, quantity: 1 }] });
    expect(quote.lines[0].issue).toBe("UNAVAILABLE");
    const input = checkoutSchema.parse({ items: [{ variantId: fx.medium.id, quantity: 1 }], deliveryMethodId: fx.delivery.id, contactChannel: "TELEGRAM", customer });
    await expect(createOrder(input, { userId: null, locale: "en" })).rejects.toMatchObject({ code: "STOCK_CHANGED" });

    await prisma.category.update({ where: { id: fx.women.id }, data: { isActive: true } });
    expect((await listProducts(buildProductQuery(), "en")).total).toBe(1);
  });
});

describe("second-hand condition", () => {
  it("exposes the condition grade on cards and product details", async () => {
    await prisma.product.update({ where: { id: fx.product.id }, data: { condition: "LIKE_NEW" } });
    const listing = await listProducts(buildProductQuery(), "en");
    expect(listing.items[0].condition).toBe("LIKE_NEW");
    expect((await getProductBySlug("test-dress", "en"))?.condition).toBe("LIKE_NEW");
  });
});

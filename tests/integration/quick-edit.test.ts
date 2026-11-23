import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { PATCH as quickEdit } from "@/app/api/admin/products/[id]/route";
import { resetDb, seedFixtures, type Fixtures } from "../support/fixtures";

const BASE = "http://localhost:3000";
let fx: Fixtures;
let adminCookie = "";
let staffCookie = "";

const patch = (id: string, body: unknown, cookie = adminCookie, origin = BASE) =>
  quickEdit(
    new Request(`${BASE}/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { Origin: origin, Host: "localhost:3000", "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) } as never,
  );

const base = () => ({
  name: "Test Dress",
  nameKm: null,
  status: "ACTIVE",
  price: "25.00",
  salePrice: "20.00",
  isFeatured: false,
  isNewArrival: false,
  isBestSeller: false,
  variants: [
    { id: fx.small.id, stock: 2, isActive: true },
    { id: fx.medium.id, stock: 10, isActive: true },
  ],
});

beforeAll(async () => {
  await resetDb();
  fx = await seedFixtures();
  adminCookie = `${SESSION_COOKIE}=${(await createSession(fx.admin.id)).token}`;
  staffCookie = `${SESSION_COOKIE}=${(await createSession(fx.staff.id)).token}`;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("product quick edit", () => {
  it("updates price, sale, flags, Khmer name and stock in one save", async () => {
    const res = await patch(fx.product.id, {
      ...base(),
      name: "Test Dress v2",
      nameKm: "រ៉ូបសាកល្បង",
      price: "30",
      salePrice: "",
      isFeatured: true,
      variants: [
        { id: fx.small.id, stock: 7, isActive: true },
        { id: fx.medium.id, stock: 10, isActive: false },
      ],
    });
    expect(res.status).toBe(200);
    const p = await prisma.product.findUniqueOrThrow({ where: { id: fx.product.id }, include: { variants: true, translations: true } });
    expect(p).toMatchObject({ name: "Test Dress v2", isFeatured: true, salePrice: null });
    expect(p.price.toFixed(2)).toBe("30.00");
    expect(p.sortPrice.toFixed(2)).toBe("30.00");
    expect(p.translations.find((t) => t.locale === "km")?.name).toBe("រ៉ូបសាកល្បង");
    expect(p.variants.find((v) => v.id === fx.small.id)?.stock).toBe(7);
    expect(p.variants.find((v) => v.id === fx.medium.id)?.isActive).toBe(false);

    const movement = await prisma.inventoryMovement.findFirst({ where: { variantId: fx.small.id }, orderBy: { createdAt: "desc" } });
    expect(movement).toMatchObject({ type: "ADJUSTMENT", stockDelta: 5, reason: "Stock updated in quick edit" });
    expect(await prisma.adminActivityLog.count({ where: { action: "product.quick_update", entityId: fx.product.id } })).toBe(1);
  });

  it("rejects a sale price that is not lower than the price", async () => {
    const res = await patch(fx.product.id, { ...base(), price: "20", salePrice: "25" });
    expect(res.status).toBe(400);
  });

  it("will not set stock below reserved units", async () => {
    await prisma.productVariant.update({ where: { id: fx.small.id }, data: { reserved: 3 } });
    const res = await patch(fx.product.id, { ...base(), variants: [{ id: fx.small.id, stock: 2, isActive: true }] });
    expect(res.status).toBe(409);
    await prisma.productVariant.update({ where: { id: fx.small.id }, data: { reserved: 0 } });
  });

  it("refuses variants that belong to another product", async () => {
    const other = await prisma.product.create({
      data: { slug: "other", sku: "T-OTHER", name: "Other", description: "x", categoryId: fx.dresses.id, price: "10", sortPrice: "10" },
    });
    const res = await patch(other.id, { ...base(), variants: [{ id: fx.small.id, stock: 99, isActive: true }] });
    expect(res.status).toBe(404);
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: fx.small.id } })).stock).not.toBe(99);
  });

  it("requires products.manage and a same-origin request", async () => {
    expect((await patch(fx.product.id, base(), staffCookie)).status).toBe(403);
    expect((await patch(fx.product.id, base(), "")).status).toBe(401);
    expect((await patch(fx.product.id, base(), adminCookie, "https://evil.example")).status).toBe(403);
  });
});

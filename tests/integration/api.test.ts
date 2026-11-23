import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { GET as listProducts } from "@/app/api/products/route";
import { GET as getProduct } from "@/app/api/products/[slug]/route";
import { GET as listCategories } from "@/app/api/categories/route";
import { POST as createOrderRoute } from "@/app/api/orders/route";
import { GET as adminOrders } from "@/app/api/admin/orders/route";
import { PUT as adminStatus } from "@/app/api/admin/orders/[id]/status/route";
import { PUT as adminSettings } from "@/app/api/admin/settings/route";
import { customer, resetDb, seedFixtures, type Fixtures } from "../support/fixtures";

const BASE = "http://localhost:3000";
let fx: Fixtures;
let adminCookie = "";
let staffCookie = "";
let customerCookie = "";

const req = (path: string, init: RequestInit & { cookie?: string } = {}) =>
  new Request(BASE + path, {
    ...init,
    headers: { Origin: BASE, Host: "localhost:3000", "Content-Type": "application/json", ...(init.cookie ? { Cookie: init.cookie } : {}), ...(init.headers ?? {}) },
  });
const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) }) as never;
const body = async (r: Response) => (await r.json()) as { ok: boolean; data: never; error?: { code: string } };

beforeAll(async () => {
  await resetDb();
  fx = await seedFixtures();
  adminCookie = `${SESSION_COOKIE}=${(await createSession(fx.admin.id)).token}`;
  staffCookie = `${SESSION_COOKIE}=${(await createSession(fx.staff.id)).token}`;
  customerCookie = `${SESSION_COOKIE}=${(await createSession(fx.customer.id)).token}`;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("public catalogue API", () => {
  it("lists only published products with server prices", async () => {
    const res = await listProducts(req("/api/products?category=women"), ctx({}));
    const { data } = await body(res);
    const items = (data as { items: { slug: string; priceCents: number; compareAtCents: number }[] }).items;
    expect(items.map((i) => i.slug)).toEqual(["test-dress"]);
    expect(items[0]).toMatchObject({ priceCents: 2000, compareAtCents: 2500 });
  });

  it("filters by size and availability", async () => {
    const none = await body(await listProducts(req("/api/products?sizes=XL"), ctx({})));
    expect((none.data as { total: number }).total).toBe(0);
    const some = await body(await listProducts(req("/api/products?sizes=M&inStock=1&sort=price_asc"), ctx({})));
    expect((some.data as { total: number }).total).toBe(1);
  });

  it("returns product details and 404s drafts", async () => {
    expect((await getProduct(req("/api/products/test-dress"), ctx({ slug: "test-dress" }))).status).toBe(200);
    expect((await getProduct(req("/api/products/draft-item"), ctx({ slug: "draft-item" }))).status).toBe(404);
  });

  it("returns the category tree", async () => {
    const { data } = await body(await listCategories(req("/api/categories"), ctx({})));
    expect((data as { slug: string; children: unknown[] }[])[0]).toMatchObject({ slug: "women" });
  });
});

describe("order API", () => {
  it("creates an order and ignores any client-sent price fields", async () => {
    const res = await createOrderRoute(
      req("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items: [{ variantId: fx.medium.id, quantity: 1, unitPrice: 0.01 }],
          deliveryMethodId: fx.delivery.id,
          contactChannel: "WHATSAPP",
          customer,
          grandTotal: 0.01,
        }),
      }),
      ctx({}),
    );
    expect(res.status).toBe(201);
    const { data } = await body(res);
    const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber: (data as { orderNumber: string }).orderNumber } });
    expect(order.grandTotal.toFixed(2)).toBe("22.00");
  });

  it("rejects cross-origin order submissions", async () => {
    const res = await createOrderRoute(req("/api/orders", { method: "POST", body: "{}", headers: { Origin: "https://evil.example" } }), ctx({}));
    expect(res.status).toBe(403);
  });

  it("returns validation errors for bad input", async () => {
    const res = await createOrderRoute(req("/api/orders", { method: "POST", body: JSON.stringify({ items: [], customer: {} }) }), ctx({}));
    expect(res.status).toBe(400);
    expect((await body(res)).error?.code).toBe("VALIDATION_ERROR");
  });
});

describe("admin authorization", () => {
  it("requires a session", async () => {
    expect((await adminOrders(req("/api/admin/orders"), ctx({}))).status).toBe(401);
  });

  it("forbids customers", async () => {
    expect((await adminOrders(req("/api/admin/orders", { cookie: customerCookie }), ctx({}))).status).toBe(403);
  });

  it("allows staff to manage orders but not settings", async () => {
    expect((await adminOrders(req("/api/admin/orders", { cookie: staffCookie }), ctx({}))).status).toBe(200);
    expect((await adminSettings(req("/api/admin/settings", { method: "PUT", body: "{}", cookie: staffCookie }), ctx({}))).status).toBe(403);
  });

  it("lets an admin update order status and blocks customers from doing so", async () => {
    const order = await prisma.order.findFirstOrThrow();
    const denied = await adminStatus(req(`/api/admin/orders/${order.id}/status`, { method: "PUT", body: JSON.stringify({ status: "CONFIRMED" }), cookie: customerCookie }), ctx({ id: order.id }));
    expect(denied.status).toBe(403);
    const okRes = await adminStatus(req(`/api/admin/orders/${order.id}/status`, { method: "PUT", body: JSON.stringify({ status: "CONFIRMED" }), cookie: adminCookie }), ctx({ id: order.id }));
    expect(okRes.status).toBe(200);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CONFIRMED");
    expect(await prisma.adminActivityLog.count({ where: { action: "order.status" } })).toBe(1);
  });
});

describe("order messaging settings", () => {
  const save = async (patch: Record<string, unknown>) => {
    const { getStoreSettings } = await import("@/services/settings");
    const current = await getStoreSettings();
    return adminSettings(req("/api/admin/settings", { method: "PUT", body: JSON.stringify({ ...current, ...patch }), cookie: adminCookie }), ctx({}));
  };

  it("works with Telegram and Messenger only — WhatsApp is optional", async () => {
    const res = await save({ telegramUsername: "dany_shop", messengerUrl: "https://m.me/danyshop", whatsappNumber: null, defaultChannel: "TELEGRAM" });
    expect(res.status).toBe(200);
    expect(await prisma.storeSettings.findUniqueOrThrow({ where: { id: "default" } })).toMatchObject({ whatsappNumber: null, messengerUrl: "https://m.me/danyshop" });
  });

  it("rejects a default channel that has no account", async () => {
    const res = await save({ telegramUsername: null, messengerUrl: "https://m.me/danyshop", whatsappNumber: null, defaultChannel: "WHATSAPP" });
    expect(res.status).toBe(400);
    expect((await body(res)).error?.code).toBe("VALIDATION_ERROR");
  });
});

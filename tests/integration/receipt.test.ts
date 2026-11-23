import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { createOrder } from "@/services/orders";
import { buildReceiptData } from "@/services/receipt";
import { GET as receipt } from "@/app/api/orders/[orderNumber]/receipt/route";
import { customer, resetDb, seedFixtures, type Fixtures } from "../support/fixtures";

const BASE = "http://localhost:3000";
const ctx = (orderNumber: string) => ({ params: Promise.resolve({ orderNumber }) }) as never;
const get = (path: string, cookie?: string) => new Request(BASE + path, { headers: cookie ? { Cookie: cookie } : {} });

let fx: Fixtures;
let order: { orderNumber: string; accessToken: string };

beforeAll(async () => {
  await resetDb();
  fx = await seedFixtures();
  order = await createOrder(
    { items: [{ variantId: fx.medium.id, quantity: 2 }], deliveryMethodId: fx.delivery.id, contactChannel: "TELEGRAM", customer: { ...customer, telegramUsername: undefined, email: undefined, deliveryNotes: undefined } },
    { userId: null, locale: "en" },
  );
}, 60_000);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("receipt PDF", () => {
  it("serves a PDF to the guest holding the order token", async () => {
    const res = await receipt(get(`/api/orders/${order.orderNumber}/receipt?token=${order.accessToken}&download=1`), ctx(order.orderNumber));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe(`attachment; filename="receipt-${order.orderNumber}.pdf"`);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  }, 60_000);

  it("opens inline for printing and renders Khmer", async () => {
    const res = await receipt(get(`/api/orders/${order.orderNumber}/receipt?token=${order.accessToken}&lang=km`), ctx(order.orderNumber));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/^inline;/);
  }, 60_000);

  it("hides the order from anyone without access", async () => {
    expect((await receipt(get(`/api/orders/${order.orderNumber}/receipt`), ctx(order.orderNumber))).status).toBe(404);
    expect((await receipt(get(`/api/orders/${order.orderNumber}/receipt?token=wrong`), ctx(order.orderNumber))).status).toBe(404);
    const other = `${SESSION_COOKIE}=${(await createSession(fx.customer.id)).token}`;
    expect((await receipt(get(`/api/orders/${order.orderNumber}/receipt`, other), ctx(order.orderNumber))).status).toBe(404);
    expect((await receipt(get(`/api/orders/not-an-order/receipt?token=x`), ctx("not-an-order"))).status).toBe(404);
  });

  it("lets staff download any receipt", async () => {
    const staff = `${SESSION_COOKIE}=${(await createSession(fx.staff.id)).token}`;
    expect((await receipt(get(`/api/orders/${order.orderNumber}/receipt`, staff), ctx(order.orderNumber))).status).toBe(200);
  }, 60_000);

  it("uses server totals and is honest about payment", async () => {
    const full = await prisma.order.findUniqueOrThrow({ where: { orderNumber: order.orderNumber }, include: { items: true, statusHistory: true } });
    const unpaid = await buildReceiptData(full, "en");
    expect(unpaid.lines[0]).toMatchObject({ qty: "2" });
    expect(unpaid.totals.at(-1)).toMatchObject({ strong: true, value: `$${full.grandTotal.toFixed(2)}` });
    expect(unpaid.note.tone).toBe("warn");
    const paid = await buildReceiptData({ ...full, paymentStatus: "PAID", paidAt: new Date("2026-11-20T03:00:00Z") }, "en");
    expect(paid.note).toMatchObject({ tone: "ok" });
    expect(paid.note.text).toContain("20 Nov 2026");
    const km = await buildReceiptData(full, "km");
    expect(km.title).toBe("បង្កាន់ដៃការកម្ម៉ង់");
  });
});

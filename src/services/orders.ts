import "server-only";
import { prisma, type Tx } from "@/lib/prisma";
import { ApiError, badRequest, notFound } from "@/lib/api";
import { fromCents, toCents } from "@/lib/money";
import { randomToken, safeEqual, sha256 } from "@/lib/security";
import { buildOrderMessage, messengerLink, telegramLink, whatsappLink, type OrderMessageData } from "@/lib/messaging/order-message";
import { dictionaries } from "@/i18n/translator";
import { isLocale, type Locale } from "@/i18n/config";
import type { CheckoutInput } from "@/lib/validations/checkout";
import type { ContactChannel, OrderStatus } from "@/generated/prisma/enums";
import { normalizeItems, priceCart } from "./cart";
import { getStoreSettings } from "./settings";
import { reserveStock } from "./inventory";

// ───────────────────────────── Order numbers ─────────────────────────────

/** Atomically allocate the next sequential number for the year: ORD-2026-00001. */
export async function nextOrderNumber(tx: Tx, now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "OrderCounter" ("year", "value") VALUES (${year}, 1)
    ON CONFLICT ("year") DO UPDATE SET "value" = "OrderCounter"."value" + 1
    RETURNING "value"`;
  return `ORD-${year}-${String(rows[0].value).padStart(5, "0")}`;
}

// ───────────────────────────── Create order ─────────────────────────────

export type CreatedOrder = { orderNumber: string; accessToken: string; id: string };

export async function createOrder(input: CheckoutInput, ctx: { userId: string | null; locale: Locale }): Promise<CreatedOrder> {
  const settings = await getStoreSettings();
  const items = normalizeItems(input.items);
  const accessToken = randomToken(24);

  const order = await prisma.$transaction(
    async (tx) => {
      // 1–4. Re-validate cart, stock, prices, coupon and delivery entirely from the database.
      const quote = await priceCart(
        // Snapshots use base (canonical) names so admin, invoices and seller messages stay consistent.
        { items, couponCode: input.couponCode ?? null, deliveryMethodId: input.deliveryMethodId, locale: "en" },
        tx,
      );
      if (quote.lines.length === 0) throw badRequest("Your bag is empty.", undefined, "EMPTY_CART");
      if (quote.lines.length !== items.length || quote.hasIssues) {
        throw new ApiError(409, "STOCK_CHANGED", "Some items changed while you were checking out. Please review your bag.");
      }
      if (!quote.deliveryMethodId || !quote.deliveryName) {
        throw badRequest("Choose a delivery method.", { deliveryMethodId: "validation.selectDelivery" }, "VALIDATION_ERROR");
      }
      if (quote.minOrderCents !== null && quote.subtotalCents < quote.minOrderCents) {
        throw badRequest(`The minimum order amount is ${fromCents(quote.minOrderCents)}.`, undefined, "MIN_ORDER");
      }
      if (input.couponCode && !quote.coupon?.ok) {
        throw badRequest("This discount code cannot be applied.", { couponCode: `coupon.${quote.coupon?.reason ?? "INVALID"}` }, "COUPON_INVALID");
      }

      // 5. Claim one coupon use atomically (respects usageLimit under concurrency).
      if (quote.couponRule) {
        const claimed = await tx.$executeRaw`
          UPDATE "Coupon" SET "usageCount" = "usageCount" + 1, "updatedAt" = NOW()
          WHERE "id" = ${quote.couponRule.id}::uuid AND "isActive" = true
            AND ("usageLimit" IS NULL OR "usageCount" < "usageLimit")`;
        if (claimed === 0) throw badRequest("This discount code has reached its usage limit.", { couponCode: "coupon.USAGE_LIMIT" }, "COUPON_INVALID");
      }

      // 7–9. Persist the order with immutable item snapshots, status PENDING.
      const orderNumber = await nextOrderNumber(tx);
      const c = input.customer;
      const created = await tx.order.create({
        data: {
          orderNumber,
          accessTokenHash: sha256(accessToken),
          userId: ctx.userId,
          status: "PENDING",
          paymentStatus: "UNPAID",
          contactChannel: input.contactChannel,
          locale: ctx.locale,
          customerName: c.fullName,
          phone: c.phone,
          telegramUsername: c.telegramUsername ?? null,
          email: c.email ?? null,
          province: c.province,
          district: c.district,
          commune: c.commune,
          addressLine: c.addressLine,
          deliveryNotes: c.deliveryNotes ?? null,
          deliveryMethodId: quote.deliveryMethodId,
          deliveryMethodName: quote.deliveryName,
          currency: quote.currency,
          subtotal: fromCents(quote.subtotalCents),
          discountTotal: fromCents(quote.discountCents),
          deliveryFee: fromCents(quote.deliveryCents),
          taxTotal: fromCents(quote.taxCents),
          grandTotal: fromCents(quote.grandTotalCents),
          couponId: quote.couponRule?.id ?? null,
          couponCode: quote.couponRule?.code ?? null,
          stockState: "RESERVED",
          reservationExpiresAt: new Date(Date.now() + settings.reservationHours * 3600 * 1000),
          items: {
            create: quote.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              productName: l.name,
              productSlug: l.slug,
              sku: l.sku,
              sizeName: l.sizeName,
              colorName: l.colorName,
              imageUrl: l.imageUrl,
              unitPrice: fromCents(l.unitCents),
              quantity: l.quantity,
              lineTotal: fromCents(l.unitCents * l.quantity),
            })),
          },
          statusHistory: { create: { toStatus: "PENDING", note: "Order submitted by customer" } },
        },
      });

      // 3. Reserve stock with conditional updates (rolls back the whole order on failure).
      for (const l of quote.lines) await reserveStock(tx, l.variantId, l.quantity, created.id);

      // Best-seller counters.
      for (const l of quote.lines) {
        await tx.product.update({ where: { id: l.productId }, data: { soldCount: { increment: l.quantity } } });
      }

      // Optional: save the address to the customer's account.
      if (ctx.userId && input.saveAddress) {
        const count = await tx.address.count({ where: { userId: ctx.userId } });
        await tx.address.create({
          data: {
            userId: ctx.userId,
            fullName: c.fullName,
            phone: c.phone,
            province: c.province,
            district: c.district,
            commune: c.commune,
            addressLine: c.addressLine,
            notes: c.deliveryNotes ?? null,
            isDefault: count === 0,
          },
        });
      }
      return created;
    },
    { timeout: 20_000 },
  );

  return { orderNumber: order.orderNumber, accessToken, id: order.id };
}

// ───────────────────────────── Read & access control ─────────────────────────────

const orderInclude = {
  items: true,
  statusHistory: { orderBy: { createdAt: "asc" as const } },
} as const;

/** Load an order if the caller may see it: matching guest token, the owning customer, or staff. */
export async function getAccessibleOrder(
  orderNumber: string,
  access: { token?: string | null; userId?: string | null; isStaff?: boolean },
) {
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: orderInclude });
  if (!order) return null;
  const tokenOk = !!access.token && safeEqual(sha256(access.token), order.accessTokenHash);
  const ownerOk = !!access.userId && order.userId === access.userId;
  if (!tokenOk && !ownerOk && !access.isStaff) return null;
  return order;
}

export type OrderWithItems = NonNullable<Awaited<ReturnType<typeof getAccessibleOrder>>>;

export function orderMessageData(order: OrderWithItems, orderUrl?: string | null): OrderMessageData {
  return {
    orderNumber: order.orderNumber,
    currency: order.currency,
    customerName: order.customerName,
    phone: order.phone,
    telegramUsername: order.telegramUsername,
    email: order.email,
    addressLine: order.addressLine,
    commune: order.commune,
    district: order.district,
    province: order.province,
    deliveryMethodName: order.deliveryMethodName,
    deliveryNotes: order.deliveryNotes,
    items: order.items.map((i) => ({
      productName: i.productName,
      sizeName: i.sizeName,
      colorName: i.colorName,
      quantity: i.quantity,
      unitCents: toCents(i.unitPrice),
      lineCents: toCents(i.lineTotal),
    })),
    subtotalCents: toCents(order.subtotal),
    discountCents: toCents(order.discountTotal),
    deliveryCents: toCents(order.deliveryFee),
    taxCents: toCents(order.taxTotal),
    grandTotalCents: toCents(order.grandTotal),
    couponCode: order.couponCode,
    orderUrl: orderUrl ?? null,
  };
}

/** Seller-facing message (in the store's default language) and the deep links for each channel. */
export async function buildSellerMessaging(order: OrderWithItems, orderUrl?: string | null) {
  const settings = await getStoreSettings();
  const sellerLocale: Locale = isLocale(settings.defaultLocale) ? settings.defaultLocale : "en";
  const message = buildOrderMessage(orderMessageData(order, orderUrl), dictionaries[sellerLocale].messages, sellerLocale);
  return {
    message,
    links: {
      TELEGRAM: telegramLink(settings.telegramUsername, message),
      WHATSAPP: whatsappLink(settings.whatsappNumber, message),
      MESSENGER: messengerLink(settings.messengerUrl),
    } satisfies Record<ContactChannel, string | null>,
  };
}

/** Customer opened a messaging app for this order → awaiting seller confirmation. Never marks as paid/confirmed. */
export async function recordContactAttempt(orderNumber: string, token: string | null, userId: string | null, channel: ContactChannel) {
  const order = await getAccessibleOrder(orderNumber, { token, userId });
  if (!order) throw notFound("Order not found");
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        contactChannel: channel,
        messageOpenedAt: order.messageOpenedAt ?? new Date(),
        ...(order.status === "PENDING" ? { status: "AWAITING_SELLER_CONFIRMATION" as OrderStatus } : {}),
      },
    });
    if (order.status === "PENDING") {
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, fromStatus: "PENDING", toStatus: "AWAITING_SELLER_CONFIRMATION", note: `Customer opened ${channel.toLowerCase()} to contact the seller` },
      });
    }
  });
}

export function assertOrderNumber(value: string) {
  if (!/^ORD-\d{4}-\d{5,}$/.test(value)) throw notFound("Order not found");
}


import "server-only";
import { prisma } from "@/lib/prisma";
import { ApiError, notFound } from "@/lib/api";
import type { OrderStatus, StockDeductionPoint } from "@/generated/prisma/enums";
import { logAdminActivity } from "./audit";
import { deductAvailableStock, deductReservedStock, releaseStock, reReserveStock, restock } from "./inventory";
import { getStoreSettings } from "./settings";

/** Allowed manual transitions. Final states (COMPLETED, CANCELLED) cannot change. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["AWAITING_SELLER_CONFIRMATION", "CONFIRMED", "AWAITING_PAYMENT", "CANCELLED"],
  AWAITING_SELLER_CONFIRMATION: ["CONFIRMED", "AWAITING_PAYMENT", "CANCELLED"],
  CONFIRMED: ["AWAITING_PAYMENT", "PAYMENT_RECEIVED", "PREPARING", "CANCELLED"],
  AWAITING_PAYMENT: ["PAYMENT_RECEIVED", "CANCELLED"],
  PAYMENT_RECEIVED: ["PREPARING", "SHIPPED", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const RANK: Partial<Record<OrderStatus, number>> = {
  CONFIRMED: 1,
  AWAITING_PAYMENT: 2,
  PAYMENT_RECEIVED: 3,
  PREPARING: 4,
  SHIPPED: 5,
  COMPLETED: 6,
};
const DEDUCT_RANK: Record<StockDeductionPoint, number> = { CONFIRMED: 1, PAYMENT_RECEIVED: 3, SHIPPED: 5 };

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Pure helper: should stock be permanently deducted when entering `to`? */
export function shouldDeduct(to: OrderStatus, point: StockDeductionPoint) {
  const r = RANK[to];
  return r !== undefined && r >= DEDUCT_RANK[point];
}

export async function updateOrderStatus(
  orderId: string,
  input: { status: OrderStatus; note: string | null; paymentNote: string | null; trackingNumber: string | null },
  user: { id: string },
  ip?: string | null,
) {
  const settings = await getStoreSettings();
  return prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw notFound("Order not found");
      const from = order.status;
      const to = input.status;
      if (from === to) throw new ApiError(400, "NO_CHANGE", "The order already has this status.");
      if (!canTransition(from, to)) throw new ApiError(400, "INVALID_TRANSITION", `Cannot change status from ${from} to ${to}.`);

      let stockState = order.stockState;
      const items = order.items.filter((i) => i.variantId) as (typeof order.items[number] & { variantId: string })[];

      if (to === "CANCELLED") {
        if (stockState === "RESERVED") {
          for (const i of items) await releaseStock(tx, i.variantId, i.quantity, order.id, "Order cancelled", user.id);
          stockState = "RELEASED";
        } else if (stockState === "DEDUCTED") {
          for (const i of items) await restock(tx, i.variantId, i.quantity, order.id, user.id);
          stockState = "RESTOCKED";
        }
        if (order.couponId) {
          await tx.$executeRaw`UPDATE "Coupon" SET "usageCount" = GREATEST(0, "usageCount" - 1) WHERE "id" = ${order.couponId}::uuid`;
        }
        for (const i of order.items) {
          if (i.productId) await tx.$executeRaw`UPDATE "Product" SET "soldCount" = GREATEST(0, "soldCount" - ${i.quantity}) WHERE "id" = ${i.productId}::uuid`;
        }
      } else {
        // A released reservation (expired) must be re-secured before the order moves forward.
        const deduct = shouldDeduct(to, settings.deductStockOn);
        if (stockState === "RELEASED") {
          if (deduct) for (const i of items) await deductAvailableStock(tx, i.variantId, i.quantity, order.id, user.id);
          else for (const i of items) await reReserveStock(tx, i.variantId, i.quantity, order.id, user.id);
          stockState = deduct ? "DEDUCTED" : "RESERVED";
        } else if (stockState === "RESERVED" && deduct) {
          for (const i of items) await deductReservedStock(tx, i.variantId, i.quantity, order.id, user.id);
          stockState = "DEDUCTED";
        }
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: to,
          stockState,
          ...(to === "PAYMENT_RECEIVED" ? { paymentStatus: "PAID", paidAt: new Date(), paymentNote: input.paymentNote ?? order.paymentNote } : {}),
          ...(to === "CANCELLED" ? { cancelledAt: new Date() } : {}),
          ...(input.trackingNumber ? { trackingNumber: input.trackingNumber } : {}),
        },
      });
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, fromStatus: from, toStatus: to, note: input.note ?? (to === "PAYMENT_RECEIVED" ? input.paymentNote : null), changedById: user.id },
      });
      await logAdminActivity(
        { userId: user.id, action: "order.status", entityType: "Order", entityId: order.id, metadata: { orderNumber: order.orderNumber, from, to }, ip },
        tx,
      );
      return updated;
    },
    { timeout: 20_000 },
  );
}

export async function updateOrderMeta(orderId: string, data: { internalNotes?: string | null; trackingNumber?: string | null }, user: { id: string }) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, orderNumber: true } });
  if (!order) throw notFound("Order not found");
  const updated = await prisma.order.update({ where: { id: orderId }, data });
  await logAdminActivity({ userId: user.id, action: "order.update", entityType: "Order", entityId: orderId, metadata: { orderNumber: order.orderNumber, fields: Object.keys(data) } });
  return updated;
}

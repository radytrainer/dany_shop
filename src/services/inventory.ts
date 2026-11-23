import "server-only";
import { prisma, type Tx } from "@/lib/prisma";
import { conflict } from "@/lib/api";
import type { InventoryMovementType } from "@/generated/prisma/enums";

/**
 * Inventory model:
 *   stock     = units physically on hand
 *   reserved  = units held for open orders
 *   available = stock − reserved
 * Every change is written to InventoryMovement (audit trail).
 * All mutations use single-statement conditional UPDATEs so concurrent orders cannot oversell.
 */

type Row = { stock: number; reserved: number };

async function logMovement(
  tx: Tx,
  data: {
    variantId: string;
    type: InventoryMovementType;
    stockDelta: number;
    reservedDelta: number;
    after: Row;
    reason?: string | null;
    orderId?: string | null;
    userId?: string | null;
  },
) {
  await tx.inventoryMovement.create({
    data: {
      variantId: data.variantId,
      type: data.type,
      stockDelta: data.stockDelta,
      reservedDelta: data.reservedDelta,
      stockAfter: data.after.stock,
      reservedAfter: data.after.reserved,
      reason: data.reason ?? null,
      orderId: data.orderId ?? null,
      userId: data.userId ?? null,
    },
  });
}

/** Reserve units for an order. Throws STOCK_CHANGED if not enough is available. */
export async function reserveStock(tx: Tx, variantId: string, quantity: number, orderId: string) {
  const rows = await tx.$queryRaw<Row[]>`
    UPDATE "ProductVariant"
    SET "reserved" = "reserved" + ${quantity}, "updatedAt" = NOW()
    WHERE "id" = ${variantId}::uuid AND "isActive" = true AND "stock" - "reserved" >= ${quantity}
    RETURNING "stock", "reserved"`;
  if (rows.length === 0) throw conflict("Some items are no longer available in the requested quantity.", "STOCK_CHANGED");
  await logMovement(tx, { variantId, type: "RESERVE", stockDelta: 0, reservedDelta: quantity, after: rows[0], orderId, reason: "Order placed" });
}

/** Release a reservation (order cancelled or reservation expired). */
export async function releaseStock(tx: Tx, variantId: string, quantity: number, orderId: string, reason: string, userId?: string | null) {
  const rows = await tx.$queryRaw<Row[]>`
    UPDATE "ProductVariant"
    SET "reserved" = GREATEST(0, "reserved" - ${quantity}), "updatedAt" = NOW()
    WHERE "id" = ${variantId}::uuid
    RETURNING "stock", "reserved"`;
  if (rows.length) await logMovement(tx, { variantId, type: "RELEASE", stockDelta: 0, reservedDelta: -quantity, after: rows[0], orderId, reason, userId });
}

/** Convert a reservation into a permanent deduction (fulfilment). */
export async function deductReservedStock(tx: Tx, variantId: string, quantity: number, orderId: string, userId?: string | null) {
  const rows = await tx.$queryRaw<Row[]>`
    UPDATE "ProductVariant"
    SET "stock" = "stock" - ${quantity}, "reserved" = GREATEST(0, "reserved" - ${quantity}), "updatedAt" = NOW()
    WHERE "id" = ${variantId}::uuid AND "stock" >= ${quantity}
    RETURNING "stock", "reserved"`;
  if (rows.length === 0) throw conflict("Not enough stock on hand to fulfil this order.", "STOCK_CHANGED");
  await logMovement(tx, { variantId, type: "DEDUCT", stockDelta: -quantity, reservedDelta: -quantity, after: rows[0], orderId, userId, reason: "Order fulfilment" });
}

/** Deduct directly from available stock (used when a released order is confirmed later). */
export async function deductAvailableStock(tx: Tx, variantId: string, quantity: number, orderId: string, userId?: string | null) {
  const rows = await tx.$queryRaw<Row[]>`
    UPDATE "ProductVariant"
    SET "stock" = "stock" - ${quantity}, "updatedAt" = NOW()
    WHERE "id" = ${variantId}::uuid AND "stock" - "reserved" >= ${quantity}
    RETURNING "stock", "reserved"`;
  if (rows.length === 0) throw conflict("Not enough available stock for this order.", "STOCK_CHANGED");
  await logMovement(tx, { variantId, type: "DEDUCT", stockDelta: -quantity, reservedDelta: 0, after: rows[0], orderId, userId, reason: "Order fulfilment" });
}

/** Re-reserve stock for an order whose reservation was released (e.g. expired then confirmed). */
export async function reReserveStock(tx: Tx, variantId: string, quantity: number, orderId: string, userId?: string | null) {
  const rows = await tx.$queryRaw<Row[]>`
    UPDATE "ProductVariant"
    SET "reserved" = "reserved" + ${quantity}, "updatedAt" = NOW()
    WHERE "id" = ${variantId}::uuid AND "stock" - "reserved" >= ${quantity}
    RETURNING "stock", "reserved"`;
  if (rows.length === 0) throw conflict("Not enough available stock to re-reserve this order.", "STOCK_CHANGED");
  await logMovement(tx, { variantId, type: "RESERVE", stockDelta: 0, reservedDelta: quantity, after: rows[0], orderId, userId, reason: "Re-reserved" });
}

/** Return deducted units to stock (order cancelled after fulfilment deduction). */
export async function restock(tx: Tx, variantId: string, quantity: number, orderId: string, userId?: string | null) {
  const rows = await tx.$queryRaw<Row[]>`
    UPDATE "ProductVariant" SET "stock" = "stock" + ${quantity}, "updatedAt" = NOW()
    WHERE "id" = ${variantId}::uuid RETURNING "stock", "reserved"`;
  if (rows.length) await logMovement(tx, { variantId, type: "RESTOCK", stockDelta: quantity, reservedDelta: 0, after: rows[0], orderId, userId, reason: "Order cancelled — restocked" });
}

/** Manual admin adjustment of on-hand stock (requires a reason). */
export async function adjustStock(variantId: string, delta: number, reason: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Row[]>`
      UPDATE "ProductVariant" SET "stock" = "stock" + ${delta}, "updatedAt" = NOW()
      WHERE "id" = ${variantId}::uuid AND "stock" + ${delta} >= "reserved" AND "stock" + ${delta} >= 0
      RETURNING "stock", "reserved"`;
    if (rows.length === 0) throw conflict("Adjustment would make stock negative or lower than reserved units.", "INVALID_ADJUSTMENT");
    await logMovement(tx, { variantId, type: "ADJUSTMENT", stockDelta: delta, reservedDelta: 0, after: rows[0], reason, userId });
    return rows[0];
  });
}

/** Set on-hand stock to an absolute value (used by the product editor). Logged as an adjustment. */
export async function setStockLevel(
  tx: Tx,
  variantId: string,
  target: number,
  userId: string,
  reason = "Stock updated in product editor",
  type: InventoryMovementType = "ADJUSTMENT",
) {
  const current = await tx.productVariant.findUnique({ where: { id: variantId }, select: { stock: true, reserved: true } });
  if (!current || current.stock === target) return;
  if (target < current.reserved) throw conflict(`Stock cannot be set below the ${current.reserved} units reserved by open orders.`, "INVALID_ADJUSTMENT");
  const after = await tx.productVariant.update({ where: { id: variantId }, data: { stock: target }, select: { stock: true, reserved: true } });
  await logMovement(tx, { variantId, type, stockDelta: target - current.stock, reservedDelta: 0, after, reason, userId });
}

/**
 * Release reservations whose hold period has passed for orders the seller has not confirmed yet.
 * The order itself stays open; confirming it later re-reserves stock if still available.
 */
export async function releaseExpiredReservations(now = new Date()): Promise<number> {
  const expired = await prisma.order.findMany({
    where: {
      stockState: "RESERVED",
      reservationExpiresAt: { lt: now },
      status: { in: ["PENDING", "AWAITING_SELLER_CONFIRMATION"] },
    },
    select: { id: true },
    take: 200,
  });
  let released = 0;
  for (const { id } of expired) {
    await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction to avoid racing with a status change.
      const order = await tx.order.findFirst({
        where: { id, stockState: "RESERVED", status: { in: ["PENDING", "AWAITING_SELLER_CONFIRMATION"] } },
        include: { items: true },
      });
      if (!order) return;
      for (const item of order.items) if (item.variantId) await releaseStock(tx, item.variantId, item.quantity, order.id, "Reservation expired");
      await tx.order.update({ where: { id }, data: { stockState: "RELEASED" } });
      await tx.orderStatusHistory.create({
        data: { orderId: id, fromStatus: order.status, toStatus: order.status, note: "Stock reservation expired and was released" },
      });
      released++;
    });
  }
  return released;
}

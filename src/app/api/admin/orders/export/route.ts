import { parseQuery } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { orderListQuerySchema } from "@/lib/validations/admin";
import { prisma } from "@/lib/prisma";
import { adminOrderWhere } from "@/services/admin-queries";
import { logAdminActivity } from "@/services/audit";
import { csvCell } from "@/lib/csv";

/** GET /api/admin/orders/export — CSV of orders matching the current filters (one row per item). */
export const GET = adminRoute("orders.view", async (req, _ctx, user) => {
  const q = parseQuery(req, orderListQuerySchema);
  const orders = await prisma.order.findMany({
    where: adminOrderWhere(q),
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: { items: true },
  });
  const header = [
    "Order Number", "Created At", "Status", "Payment", "Channel", "Customer", "Phone", "Telegram", "Email",
    "Address", "Commune", "District", "Province", "Delivery Method", "Coupon",
    "Product", "SKU", "Size", "Color", "Quantity", "Unit Price", "Line Total",
    "Subtotal", "Discount", "Delivery Fee", "Tax", "Grand Total", "Currency", "Tracking",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const o of orders) {
    for (const i of o.items) {
      lines.push(
        [
          o.orderNumber, o.createdAt, o.status, o.paymentStatus, o.contactChannel, o.customerName, o.phone, o.telegramUsername, o.email,
          o.addressLine, o.commune, o.district, o.province, o.deliveryMethodName, o.couponCode,
          i.productName, i.sku, i.sizeName, i.colorName, i.quantity, i.unitPrice.toFixed(2), i.lineTotal.toFixed(2),
          o.subtotal.toFixed(2), o.discountTotal.toFixed(2), o.deliveryFee.toFixed(2), o.taxTotal.toFixed(2), o.grandTotal.toFixed(2), o.currency, o.trackingNumber,
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }
  await logAdminActivity({ userId: user.id, action: "order.export", entityType: "Order", metadata: { count: orders.length }, ip: user.ip });
  const date = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});

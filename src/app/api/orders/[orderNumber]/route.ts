import { notFound, ok, route } from "@/lib/api";
import { getRequestUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/permissions";
import { toCents } from "@/lib/money";
import { assertOrderNumber, buildSellerMessaging, getAccessibleOrder } from "@/services/orders";

/** GET /api/orders/[orderNumber]?token= — order status for the guest (token), owner, or staff. */
export const GET = route<RouteContext<"/api/orders/[orderNumber]">>(async (req, ctx) => {
  const { orderNumber } = await ctx.params;
  assertOrderNumber(orderNumber);
  const token = new URL(req.url).searchParams.get("token");
  const user = await getRequestUser(req);
  const order = await getAccessibleOrder(orderNumber, { token, userId: user?.id, isStaff: isStaffRole(user?.role) });
  if (!order) throw notFound("Order not found");
  const orderUrl = token ? `${process.env.APP_URL ?? ""}/orders/${order.orderNumber}?token=${encodeURIComponent(token)}` : null;
  const messaging = await buildSellerMessaging(order, orderUrl);
  return ok({
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    contactChannel: order.contactChannel,
    createdAt: order.createdAt,
    currency: order.currency,
    customerName: order.customerName,
    deliveryMethodName: order.deliveryMethodName,
    trackingNumber: order.trackingNumber,
    items: order.items.map((i) => ({
      productName: i.productName,
      productSlug: i.productSlug,
      sizeName: i.sizeName,
      colorName: i.colorName,
      imageUrl: i.imageUrl,
      quantity: i.quantity,
      unitCents: toCents(i.unitPrice),
      lineCents: toCents(i.lineTotal),
    })),
    subtotalCents: toCents(order.subtotal),
    discountCents: toCents(order.discountTotal),
    deliveryCents: toCents(order.deliveryFee),
    taxCents: toCents(order.taxTotal),
    grandTotalCents: toCents(order.grandTotal),
    statusHistory: order.statusHistory.map((h) => ({ status: h.toStatus, at: h.createdAt })),
    messaging,
  });
});

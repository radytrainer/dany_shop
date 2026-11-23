import { ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { orderStatusUpdateSchema } from "@/lib/validations/admin";
import { updateOrderStatus } from "@/services/admin-orders";

/**
 * PUT /api/admin/orders/[id]/status — authorised staff only.
 * Applies inventory effects (deduct / release / restock) and records history + audit log.
 */
export const PUT = adminRoute<RouteContext<"/api/admin/orders/[id]/status">>("orders.manage", async (req, ctx, user) => {
  const { id } = await ctx.params;
  const input = await parseJson(req, orderStatusUpdateSchema);
  const order = await updateOrderStatus(id, input, user, user.ip);
  return ok({ id: order.id, status: order.status, paymentStatus: order.paymentStatus, stockState: order.stockState });
});

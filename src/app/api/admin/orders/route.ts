import { ok, parseQuery } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { orderListQuerySchema } from "@/lib/validations/admin";
import { listAdminOrders } from "@/services/admin-queries";
import { releaseExpiredReservations } from "@/services/inventory";

/** GET /api/admin/orders — search/filter/paginate all submitted orders. */
export const GET = adminRoute("orders.view", async (req) => {
  await releaseExpiredReservations();
  return ok(await listAdminOrders(parseQuery(req, orderListQuerySchema)));
});

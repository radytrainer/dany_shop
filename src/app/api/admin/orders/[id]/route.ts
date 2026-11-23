import { notFound, ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { orderPatchSchema } from "@/lib/validations/admin";
import { prisma } from "@/lib/prisma";
import { updateOrderMeta } from "@/services/admin-orders";

type Ctx = RouteContext<"/api/admin/orders/[id]">;

/** GET /api/admin/orders/[id] — full order with items, history and customer contact. */
export const GET = adminRoute<Ctx>("orders.view", async (_req, ctx) => {
  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      statusHistory: { orderBy: { createdAt: "asc" }, include: { changedBy: { select: { name: true } } } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!order) throw notFound("Order not found");
  const { accessTokenHash: _hidden, ...safe } = order;
  return ok(safe);
});

/** PATCH /api/admin/orders/[id] — internal notes and tracking number. */
export const PATCH = adminRoute<Ctx>("orders.manage", async (req, ctx, user) => {
  const { id } = await ctx.params;
  const data = await parseJson(req, orderPatchSchema);
  const updated = await updateOrderMeta(id, data, user);
  return ok({ id: updated.id });
});

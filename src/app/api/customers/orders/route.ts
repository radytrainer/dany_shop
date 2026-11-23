import { ok, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { toCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";

/** GET /api/customers/orders — the signed-in customer's order history. */
export const GET = route(async (req) => {
  const user = await requireUser(req);
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { items: true } } },
  });
  return ok(
    orders.map((o) => ({
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
      currency: o.currency,
      grandTotalCents: toCents(o.grandTotal),
      itemCount: o._count.items,
    })),
  );
});

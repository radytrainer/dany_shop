import { z } from "zod";
import { ok, parseQuery } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { prisma } from "@/lib/prisma";

const schema = z.object({ variantId: z.string().uuid().optional(), page: z.coerce.number().int().min(1).catch(1).default(1) });

/** GET /api/admin/inventory/movements — stock adjustment / reservation history. */
export const GET = adminRoute("inventory.view", async (req) => {
  const { variantId, page } = parseQuery(req, schema);
  const where = variantId ? { variantId } : {};
  const [total, rows] = await Promise.all([
    prisma.inventoryMovement.count({ where }),
    prisma.inventoryMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 50,
      take: 50,
      include: {
        user: { select: { name: true } },
        order: { select: { orderNumber: true } },
        variant: { select: { sku: true, product: { select: { name: true } } } },
      },
    }),
  ]);
  return ok({ total, page, items: rows });
});

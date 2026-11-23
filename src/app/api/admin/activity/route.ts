import { z } from "zod";
import { ok, parseQuery } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { prisma } from "@/lib/prisma";

const schema = z.object({ page: z.coerce.number().int().min(1).catch(1).default(1), entityType: z.string().max(40).optional() });

/** GET /api/admin/activity — audit log of sensitive admin operations. */
export const GET = adminRoute("logs.view", async (req) => {
  const { page, entityType } = parseQuery(req, schema);
  const where = entityType ? { entityType } : {};
  const [total, items] = await Promise.all([
    prisma.adminActivityLog.count({ where }),
    prisma.adminActivityLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50, include: { user: { select: { name: true, email: true } } } }),
  ]);
  return ok({ total, page, items });
});

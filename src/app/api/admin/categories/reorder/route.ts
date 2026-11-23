import { ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { reorderSchema } from "@/lib/validations/admin";
import { prisma } from "@/lib/prisma";
import { logAdminActivity } from "@/services/audit";

/** POST /api/admin/categories/reorder — set sortOrder from the given id order (siblings). */
export const POST = adminRoute("categories.manage", async (req, _ctx, user) => {
  const { ids } = await parseJson(req, reorderSchema);
  await prisma.$transaction(ids.map((id, i) => prisma.category.update({ where: { id }, data: { sortOrder: i } })));
  await logAdminActivity({ userId: user.id, action: "category.reorder", entityType: "Category", metadata: { count: ids.length }, ip: user.ip });
  return ok({ reordered: ids.length });
});

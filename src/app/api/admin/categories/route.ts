import { badRequest, ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { categoryInputSchema } from "@/lib/validations/admin";
import { prisma } from "@/lib/prisma";
import { logAdminActivity } from "@/services/audit";

/** GET /api/admin/categories — flat list with product counts. */
export const GET = adminRoute("products.view", async () => {
  const rows = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
    include: { translations: true, _count: { select: { products: true, children: true } } },
  });
  return ok(rows);
});

/** POST /api/admin/categories */
export const POST = adminRoute("categories.manage", async (req, _ctx, user) => {
  const { nameKm, descriptionKm, ...data } = await parseJson(req, categoryInputSchema);
  if (data.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: data.parentId }, select: { parentId: true } });
    if (!parent) throw badRequest("Parent category not found");
    if (parent.parentId) throw badRequest("Categories support two levels (category → subcategory).");
  }
  const cat = await prisma.category.create({
    data: { ...data, translations: nameKm ? { create: { locale: "km", name: nameKm, description: descriptionKm } } : undefined },
  });
  await logAdminActivity({ userId: user.id, action: "category.create", entityType: "Category", entityId: cat.id, metadata: { name: cat.name }, ip: user.ip });
  return ok(cat, { status: 201 });
});

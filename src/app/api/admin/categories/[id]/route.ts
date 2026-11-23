import { badRequest, conflict, notFound, ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { categoryInputSchema } from "@/lib/validations/admin";
import { prisma } from "@/lib/prisma";
import { logAdminActivity } from "@/services/audit";

type Ctx = RouteContext<"/api/admin/categories/[id]">;

/** PUT /api/admin/categories/[id] — rename, re-parent, reorder, (de)activate. */
export const PUT = adminRoute<Ctx>("categories.manage", async (req, ctx, user) => {
  const { id } = await ctx.params;
  const { nameKm, descriptionKm, ...data } = await parseJson(req, categoryInputSchema);
  const existing = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { children: true } } } });
  if (!existing) throw notFound("Category not found");
  if (data.parentId) {
    if (data.parentId === id) throw badRequest("A category cannot be its own parent.");
    const parent = await prisma.category.findUnique({ where: { id: data.parentId }, select: { parentId: true } });
    if (!parent) throw badRequest("Parent category not found");
    if (parent.parentId || existing._count.children > 0) throw badRequest("Categories support two levels (category → subcategory).");
  }
  const cat = await prisma.$transaction(async (tx) => {
    const updated = await tx.category.update({ where: { id }, data });
    if (nameKm) {
      await tx.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: id, locale: "km" } },
        update: { name: nameKm, description: descriptionKm },
        create: { categoryId: id, locale: "km", name: nameKm, description: descriptionKm },
      });
    } else await tx.categoryTranslation.deleteMany({ where: { categoryId: id, locale: "km" } });
    return updated;
  });
  await logAdminActivity({ userId: user.id, action: "category.update", entityType: "Category", entityId: id, metadata: { name: cat.name, isActive: cat.isActive }, ip: user.ip });
  return ok(cat);
});

/** DELETE /api/admin/categories/[id] — only empty categories can be deleted (otherwise deactivate). */
export const DELETE = adminRoute<Ctx>("categories.manage", async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const cat = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
  if (!cat) throw notFound("Category not found");
  if (cat._count.products > 0 || cat._count.children > 0) {
    throw conflict("This category still has products or subcategories. Move them or deactivate the category instead.", "IN_USE");
  }
  await prisma.category.delete({ where: { id } });
  await logAdminActivity({ userId: user.id, action: "category.delete", entityType: "Category", entityId: id, metadata: { name: cat.name }, ip: user.ip });
  return ok({ deleted: id });
});

import { notFound, ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { productInputSchema, productQuickEditSchema } from "@/lib/validations/admin";
import { prisma } from "@/lib/prisma";
import { deleteProduct, quickUpdateProduct, saveProduct } from "@/services/admin-products";

type Ctx = RouteContext<"/api/admin/products/[id]">;

/** GET /api/admin/products/[id] — full product for the editor. */
export const GET = adminRoute<Ctx>("products.view", async (_req, ctx) => {
  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { include: { size: true, color: true }, orderBy: [{ size: { sortOrder: "asc" } }, { color: { sortOrder: "asc" } }, { sku: "asc" }] },
      translations: true,
      collections: { select: { collectionId: true } },
    },
  });
  if (!product) throw notFound("Product not found");
  return ok(product);
});

/** PUT /api/admin/products/[id] */
export const PUT = adminRoute<Ctx>("products.manage", async (req, ctx, user) => {
  const { id } = await ctx.params;
  const input = await parseJson(req, productInputSchema);
  await saveProduct(input, user.id, id);
  return ok({ id });
});

/** DELETE /api/admin/products/[id] — deletes, or archives when the product has order history. */
export const DELETE = adminRoute<Ctx>("products.manage", async (_req, ctx, user) => {
  const { id } = await ctx.params;
  return ok({ result: await deleteProduct(id, user.id) });
});

/** PATCH /api/admin/products/[id] — quick edit from the product list. */
export const PATCH = adminRoute<Ctx>("products.manage", async (req, ctx, user) => {
  const { id } = await ctx.params;
  const input = await parseJson(req, productQuickEditSchema);
  await quickUpdateProduct(id, input, user.id);
  return ok({ id });
});

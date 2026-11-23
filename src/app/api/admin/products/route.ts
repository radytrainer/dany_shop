import { z } from "zod";
import { ok, parseJson, parseQuery } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { productInputSchema } from "@/lib/validations/admin";
import { listAdminProducts } from "@/services/admin-queries";
import { saveProduct } from "@/services/admin-products";

const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.string().optional(),
  category: z.string().uuid().optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

/** GET /api/admin/products */
export const GET = adminRoute("products.view", async (req) => ok(await listAdminProducts(parseQuery(req, listSchema))));

/** POST /api/admin/products — create a product with variants and images. */
export const POST = adminRoute("products.manage", async (req, _ctx, user) => {
  const input = await parseJson(req, productInputSchema);
  const id = await saveProduct(input, user.id);
  return ok({ id }, { status: 201 });
});

import { ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { collectionInputSchema } from "@/lib/validations/admin";
import { prisma } from "@/lib/prisma";
import { saveCollection } from "@/services/admin-content";

/** GET /api/admin/collections */
export const GET = adminRoute("content.manage", async () =>
  ok(await prisma.collection.findMany({ orderBy: { sortOrder: "asc" }, include: { products: { orderBy: { sortOrder: "asc" }, select: { productId: true } } } })),
);

/** POST /api/admin/collections */
export const POST = adminRoute("content.manage", async (req, _ctx, user) => ok(await saveCollection(await parseJson(req, collectionInputSchema), user), { status: 201 }));

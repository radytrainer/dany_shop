import { ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { promotionInputSchema } from "@/lib/validations/admin";
import { prisma } from "@/lib/prisma";
import { savePromotion } from "@/services/admin-content";

/** GET /api/admin/promotions */
export const GET = adminRoute("promotions.manage", async () =>
  ok(await prisma.promotion.findMany({ orderBy: { createdAt: "desc" }, include: { categories: { select: { id: true, name: true } }, products: { select: { id: true, name: true } } } })),
);

/** POST /api/admin/promotions */
export const POST = adminRoute("promotions.manage", async (req, _ctx, user) => ok(await savePromotion(await parseJson(req, promotionInputSchema), user), { status: 201 }));

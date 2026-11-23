import { ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { couponInputSchema } from "@/lib/validations/admin";
import { prisma } from "@/lib/prisma";
import { saveCoupon } from "@/services/admin-content";

/** GET /api/admin/coupons */
export const GET = adminRoute("promotions.manage", async () =>
  ok(await prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { categories: { select: { id: true, name: true } }, products: { select: { id: true, name: true } } } })),
);

/** POST /api/admin/coupons */
export const POST = adminRoute("promotions.manage", async (req, _ctx, user) => ok(await saveCoupon(await parseJson(req, couponInputSchema), user), { status: 201 }));

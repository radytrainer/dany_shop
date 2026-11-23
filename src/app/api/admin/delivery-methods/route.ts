import { ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { deliveryMethodInputSchema } from "@/lib/validations/admin";
import { prisma } from "@/lib/prisma";
import { saveDeliveryMethod } from "@/services/admin-content";

/** GET /api/admin/delivery-methods */
export const GET = adminRoute("settings.manage", async () => ok(await prisma.deliveryMethod.findMany({ orderBy: { sortOrder: "asc" } })));

/** POST /api/admin/delivery-methods */
export const POST = adminRoute("settings.manage", async (req, _ctx, user) =>
  ok(await saveDeliveryMethod(await parseJson(req, deliveryMethodInputSchema), user), { status: 201 }),
);

import { ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { bannerInputSchema } from "@/lib/validations/admin";
import { prisma } from "@/lib/prisma";
import { saveBanner } from "@/services/admin-content";

/** GET /api/admin/banners */
export const GET = adminRoute("content.manage", async () => ok(await prisma.banner.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] })));

/** POST /api/admin/banners */
export const POST = adminRoute("content.manage", async (req, _ctx, user) => ok(await saveBanner(await parseJson(req, bannerInputSchema), user), { status: 201 }));

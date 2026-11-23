import "server-only";
import { route } from "@/lib/api";
import { requireAdmin, type SessionUser } from "@/lib/auth";
import { enforceRateLimit, getClientIp } from "@/lib/security";
import { invalidateStorefrontCache } from "@/lib/shared-cache";
import type { Permission } from "@/lib/permissions";

type AdminHandler<C> = (req: Request, ctx: C, user: SessionUser & { ip: string }) => Promise<Response>;

/** Admin route handler: server-side RBAC + same-origin check + write rate limiting + uniform errors. */
export function adminRoute<C = unknown>(permission: Permission, handler: AdminHandler<C>) {
  return route<C>(async (req, ctx) => {
    const user = await requireAdmin(req, permission);
    const write = req.method !== "GET";
    if (write) enforceRateLimit(req, "write", user.id);
    const res = await handler(req, ctx, { ...user, ip: getClientIp(req.headers) });
    // Settings, categories, promotions, banners, collections and delivery are cached for shoppers.
    if (write && res.ok) invalidateStorefrontCache();
    return res;
  });
}

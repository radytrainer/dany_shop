import "server-only";
import { route } from "@/lib/api";
import { requireAdmin, type SessionUser } from "@/lib/auth";
import { enforceRateLimit, getClientIp } from "@/lib/security";
import type { Permission } from "@/lib/permissions";

type AdminHandler<C> = (req: Request, ctx: C, user: SessionUser & { ip: string }) => Promise<Response>;

/** Admin route handler: server-side RBAC + same-origin check + write rate limiting + uniform errors. */
export function adminRoute<C = unknown>(permission: Permission, handler: AdminHandler<C>) {
  return route<C>(async (req, ctx) => {
    const user = await requireAdmin(req, permission);
    if (req.method !== "GET") enforceRateLimit(req, "write", user.id);
    return handler(req, ctx, { ...user, ip: getClientIp(req.headers) });
  });
}

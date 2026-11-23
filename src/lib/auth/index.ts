import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { forbidden, unauthorized } from "@/lib/api";
import { can, isStaffRole, type Permission } from "@/lib/permissions";
import { assertSameOrigin } from "@/lib/security";
import { getUserBySessionToken, readSessionToken, SESSION_COOKIE, type SessionUser } from "./session";

export type { SessionUser } from "./session";

// ───────────────────────────── Server components ─────────────────────────────

/** Current user for server components/pages (memoised per request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  return getUserBySessionToken(store.get(SESSION_COOKIE)?.value);
});

export async function requireAdminPage(permission: Permission = "dashboard.view"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) redirect("/admin/login");
  if (!can(user.role, permission)) redirect("/admin?denied=1");
  return user;
}

export async function requireCustomerPage(next = "/account"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return user;
}

// ───────────────────────────── Route handlers ─────────────────────────────

export async function getRequestUser(req: Request): Promise<SessionUser | null> {
  return getUserBySessionToken(readSessionToken(req));
}

/** Any signed-in user. Also enforces same-origin for mutations. */
export async function requireUser(req: Request): Promise<SessionUser> {
  assertSameOrigin(req);
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  return user;
}

/** Signed-in staff member holding `permission`. Also enforces same-origin for mutations. */
export async function requireAdmin(req: Request, permission: Permission): Promise<SessionUser> {
  assertSameOrigin(req);
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  if (!isStaffRole(user.role) || !can(user.role, permission)) throw forbidden();
  return user;
}

import { NextResponse } from "next/server";
import { ApiError, forbidden, parseJson, route } from "@/lib/api";
import { assertSameOrigin, enforceRateLimit, getClientIp } from "@/lib/security";
import { burnPasswordCheck, createSession, deleteSessionByToken, readSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/permissions";
import { loginSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { logAdminActivity } from "@/services/audit";

/** POST /api/auth/login — email/password sign-in (customer or admin scope). */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const { email, password, scope } = await parseJson(req, loginSchema);
  enforceRateLimit(req, "login");
  enforceRateLimit(req, "login", email);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    await burnPasswordCheck(password);
    throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    if (isStaffRole(user.role)) await logAdminActivity({ userId: user.id, action: "auth.login_failed", entityType: "User", entityId: user.id, ip: getClientIp(req.headers) });
    throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
  }
  if (scope === "admin" && !isStaffRole(user.role)) throw forbidden("This account does not have admin access.");

  // Rotate: drop any session presented with this request before issuing a new one.
  await deleteSessionByToken(readSessionToken(req));
  const ip = getClientIp(req.headers);
  const { token, expiresAt } = await createSession(user.id, { userAgent: req.headers.get("user-agent"), ip });
  if (isStaffRole(user.role)) await logAdminActivity({ userId: user.id, action: "auth.login", entityType: "User", entityId: user.id, ip });

  const res = NextResponse.json({ ok: true, data: { id: user.id, name: user.name, role: user.role } });
  setSessionCookie(res, token, expiresAt);
  return res;
});

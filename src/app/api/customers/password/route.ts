import { ApiError, ok, parseJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteUserSessions, hashPassword, readSessionToken, verifyPassword } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security";
import { changePasswordSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";

/** PUT /api/customers/password — change password; signs out all other sessions. */
export const PUT = route(async (req) => {
  const user = await requireUser(req);
  enforceRateLimit(req, "login", user.id);
  const { currentPassword, newPassword } = await parseJson(req, changePasswordSchema);
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(currentPassword, row.passwordHash))) {
    throw new ApiError(400, "WRONG_PASSWORD", "Current password is incorrect.", { currentPassword: "account.wrongPassword" });
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  await deleteUserSessions(user.id, readSessionToken(req) ?? undefined);
  return ok({ changed: true });
});

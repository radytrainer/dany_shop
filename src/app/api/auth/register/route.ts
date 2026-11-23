import { NextResponse } from "next/server";
import { conflict, parseJson, route } from "@/lib/api";
import { assertSameOrigin, enforceRateLimit, getClientIp } from "@/lib/security";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/i18n/server";

/** POST /api/auth/register — create a customer account and sign in. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "register");
  const { name, email, phone, password } = await parseJson(req, registerSchema);
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw conflict("An account with this email already exists.", "EMAIL_TAKEN");
  }
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone ?? null,
      role: "CUSTOMER",
      passwordHash: await hashPassword(password),
      customerProfile: { create: { preferredLocale: await getLocale() } },
    },
  });
  const { token, expiresAt } = await createSession(user.id, { userAgent: req.headers.get("user-agent"), ip: getClientIp(req.headers) });
  const res = NextResponse.json({ ok: true, data: { id: user.id, name: user.name } }, { status: 201 });
  setSessionCookie(res, token, expiresAt);
  return res;
});

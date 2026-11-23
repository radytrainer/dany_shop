import "server-only";
import bcrypt from "bcryptjs";
import type { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomToken, sha256 } from "@/lib/security";
import type { Role } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "ds_session";
const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
};

// ───────────────────────────── Passwords ─────────────────────────────

const BCRYPT_COST = 12;
export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_COST);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
/** Equalise login timing when the email does not exist (prevents account enumeration). */
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(plain: string) {
  dummyHash ??= bcrypt.hash("timing-equaliser", BCRYPT_COST);
  await bcrypt.compare(plain, await dummyHash);
}

// ───────────────────────────── Sessions ─────────────────────────────

function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE === "true";
  return process.env.NODE_ENV === "production" && (process.env.APP_URL ?? "").startsWith("https://");
}

export async function createSession(userId: string, meta: { userAgent?: string | null; ip?: string | null } = {}) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await prisma.session.create({
    data: {
      id: sha256(token),
      userId,
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
      ip: meta.ip ?? null,
    },
  });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  return { token, expiresAt };
}

export function setSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: cookieSecure(), sameSite: "lax", path: "/", maxAge: 0 });
}

/** Resolve a raw cookie token to an active user, sliding the expiry forward. */
export async function getUserBySessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  const id = sha256(token);
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, name: true, phone: true, role: true, isActive: true } } },
  });
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() <= now || !session.user.isActive) {
    await prisma.session.delete({ where: { id } }).catch(() => undefined);
    return null;
  }
  // Slide expiry when less than half the lifetime remains.
  if (session.expiresAt.getTime() - now < SESSION_MS / 2) {
    await prisma.session.update({ where: { id }, data: { expiresAt: new Date(now + SESSION_MS) } }).catch(() => undefined);
  }
  const { isActive: _isActive, ...user } = session.user;
  return user;
}

export async function deleteSessionByToken(token: string | undefined | null) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { id: sha256(token) } });
}

export async function deleteUserSessions(userId: string, exceptToken?: string) {
  await prisma.session.deleteMany({
    where: { userId, ...(exceptToken ? { NOT: { id: sha256(exceptToken) } } : {}) },
  });
}

/** Read the session token from a raw Request (route handlers, tests). */
export function readSessionToken(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

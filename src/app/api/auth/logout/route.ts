import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { assertSameOrigin } from "@/lib/security";
import { clearSessionCookie, deleteSessionByToken, readSessionToken } from "@/lib/auth/session";

/** POST /api/auth/logout — end the current session. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  await deleteSessionByToken(readSessionToken(req));
  const res = NextResponse.json({ ok: true, data: null });
  clearSessionCookie(res);
  return res;
});

import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJson, route } from "@/lib/api";
import { assertSameOrigin } from "@/lib/security";
import { LOCALE_COOKIE, LOCALES } from "@/i18n/config";

/** POST /api/locale — switch the storefront language. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const { locale } = await parseJson(req, z.object({ locale: z.enum(LOCALES) }));
  const res = NextResponse.json({ ok: true, data: { locale } });
  res.cookies.set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return res;
});

import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route protection: if there is no session cookie at all, redirect to the
 * relevant sign-in page before rendering. This is NOT the security boundary — every
 * protected page and API handler re-validates the session and role on the server.
 */
const SESSION_COOKIE = "ds_session";

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const isAccountArea = pathname === "/account" || pathname.startsWith("/account/orders") || pathname.startsWith("/account/addresses");
  if (isAccountArea && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/account/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  // Never cache private pages in shared caches.
  if (pathname.startsWith("/admin") || pathname.startsWith("/account") || pathname.startsWith("/orders") || pathname.startsWith("/checkout")) {
    res.headers.set("Cache-Control", "private, no-store");
  }
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/orders/:path*", "/checkout"],
};

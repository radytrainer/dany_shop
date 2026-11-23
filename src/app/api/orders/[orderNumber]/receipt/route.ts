import { notFound, route } from "@/lib/api";
import { getRequestUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/permissions";
import { enforceRateLimit } from "@/lib/security";
import { isLocale } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { assertOrderNumber, getAccessibleOrder } from "@/services/orders";
import { renderOrderReceipt } from "@/services/receipt";

// Fonts are read from disk and the PDF is rendered with Node APIs.
export const runtime = "nodejs";

/**
 * GET /api/orders/[orderNumber]/receipt?token=&download=1&lang=
 * The order receipt as a PDF, for the guest (token), the owning customer, or staff.
 * `download=1` saves the file; otherwise it opens in the browser's viewer for printing.
 */
export const GET = route<RouteContext<"/api/orders/[orderNumber]/receipt">>(async (req, ctx) => {
  const { orderNumber } = await ctx.params;
  assertOrderNumber(orderNumber);
  enforceRateLimit(req, "receipt");

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const user = await getRequestUser(req);
  const order = await getAccessibleOrder(orderNumber, { token, userId: user?.id, isStaff: isStaffRole(user?.role) });
  if (!order) throw notFound("Order not found");

  const lang = url.searchParams.get("lang");
  const locale = isLocale(lang) ? lang : await getLocale();
  const pdf = await renderOrderReceipt(order, locale);

  const filename = `receipt-${order.orderNumber}.pdf`;
  const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Content-Length": String(pdf.length),
      // Contains personal data: never cache in shared caches, never keep a stored copy.
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
});

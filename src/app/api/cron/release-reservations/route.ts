import { ok, route, unauthorized } from "@/lib/api";
import { safeEqual } from "@/lib/security";
import { releaseExpiredReservations } from "@/services/inventory";

/**
 * POST /api/cron/release-reservations — release stock held by unconfirmed orders past the reservation window.
 * Call from cron with:  Authorization: Bearer $CRON_SECRET
 */
export const POST = route(async (req) => {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) throw unauthorized("Invalid cron secret");
  const released = await releaseExpiredReservations();
  return ok({ released });
});

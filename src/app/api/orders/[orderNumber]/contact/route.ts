import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { getRequestUser } from "@/lib/auth";
import { assertSameOrigin, enforceRateLimit } from "@/lib/security";
import { CONTACT_CHANNELS } from "@/lib/validations/checkout";
import { assertOrderNumber, recordContactAttempt } from "@/services/orders";

const schema = z.object({ token: z.string().max(100).nullish(), channel: z.enum(CONTACT_CHANNELS) });

/**
 * POST /api/orders/[orderNumber]/contact — the customer opened a messaging app for this order.
 * Moves PENDING → AWAITING_SELLER_CONFIRMATION. Does not confirm or mark the order paid.
 */
export const POST = route<RouteContext<"/api/orders/[orderNumber]/contact">>(async (req, ctx) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "write");
  const { orderNumber } = await ctx.params;
  assertOrderNumber(orderNumber);
  const { token, channel } = await parseJson(req, schema);
  const user = await getRequestUser(req);
  await recordContactAttempt(orderNumber, token ?? null, user?.id ?? null, channel);
  return ok({ recorded: true });
});

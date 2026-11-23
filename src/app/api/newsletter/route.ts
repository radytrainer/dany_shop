import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { assertSameOrigin, enforceRateLimit } from "@/lib/security";
import { getLocale } from "@/i18n/server";
import { prisma } from "@/lib/prisma";

const schema = z.object({ email: z.string().trim().toLowerCase().email("validation.email").max(254) });

/** POST /api/newsletter — subscribe an email address (idempotent). */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "newsletter");
  const { email } = await parseJson(req, schema);
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (existing) return ok({ status: "exists" as const });
  await prisma.newsletterSubscriber.create({ data: { email, locale: await getLocale() } });
  return ok({ status: "subscribed" as const });
});

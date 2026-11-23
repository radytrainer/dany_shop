import { ok, parseJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { profileSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/customers/profile */
export const GET = route(async (req) => {
  const user = await requireUser(req);
  const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
  return ok({
    name: user.name,
    email: user.email,
    phone: user.phone,
    telegramUsername: profile?.telegramUsername ?? null,
    preferredLocale: profile?.preferredLocale ?? "en",
    newsletter: profile?.newsletter ?? false,
  });
});

/** PUT /api/customers/profile — update contact information. */
export const PUT = route(async (req) => {
  const user = await requireUser(req);
  const data = await parseJson(req, profileSchema);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { name: data.name, phone: data.phone ?? null } }),
    prisma.customerProfile.upsert({
      where: { userId: user.id },
      update: {
        telegramUsername: data.telegramUsername ?? null,
        ...(data.preferredLocale ? { preferredLocale: data.preferredLocale } : {}),
        ...(data.newsletter !== undefined ? { newsletter: data.newsletter } : {}),
      },
      create: { userId: user.id, telegramUsername: data.telegramUsername ?? null, preferredLocale: data.preferredLocale ?? "en", newsletter: data.newsletter ?? false },
    }),
  ]);
  return ok({ updated: true });
});

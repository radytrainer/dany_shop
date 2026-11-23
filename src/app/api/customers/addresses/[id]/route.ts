import { notFound, ok, parseJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { addressSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";

async function ownAddress(userId: string, id: string) {
  const a = await prisma.address.findFirst({ where: { id, userId } });
  if (!a) throw notFound("Address not found");
  return a;
}

/** PUT /api/customers/addresses/[id] */
export const PUT = route<RouteContext<"/api/customers/addresses/[id]">>(async (req, ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  await ownAddress(user.id, id);
  const data = await parseJson(req, addressSchema);
  const updated = await prisma.$transaction(async (tx) => {
    if (data.isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    return tx.address.update({ where: { id }, data: { ...data, label: data.label ?? null, notes: data.notes ?? null, isDefault: data.isDefault ?? undefined } });
  });
  return ok(updated);
});

/** DELETE /api/customers/addresses/[id] */
export const DELETE = route<RouteContext<"/api/customers/addresses/[id]">>(async (req, ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const a = await ownAddress(user.id, id);
  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });
    if (a.isDefault) {
      const next = await tx.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
  return ok({ deleted: id });
});

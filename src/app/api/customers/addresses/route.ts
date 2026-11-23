import { badRequest, ok, parseJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { addressSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";

const MAX_ADDRESSES = 10;

/** GET /api/customers/addresses */
export const GET = route(async (req) => {
  const user = await requireUser(req);
  return ok(await prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }));
});

/** POST /api/customers/addresses */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const data = await parseJson(req, addressSchema);
  const count = await prisma.address.count({ where: { userId: user.id } });
  if (count >= MAX_ADDRESSES) throw badRequest(`You can save up to ${MAX_ADDRESSES} addresses.`);
  const makeDefault = data.isDefault || count === 0;
  const address = await prisma.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    return tx.address.create({ data: { ...data, label: data.label ?? null, notes: data.notes ?? null, isDefault: makeDefault, userId: user.id } });
  });
  return ok(address, { status: 201 });
});

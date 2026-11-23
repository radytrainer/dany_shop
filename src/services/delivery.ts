import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { toCents } from "@/lib/money";
import type { Locale } from "@/i18n/config";
import { pickTranslation } from "./content";

export type DeliveryMethodDTO = {
  id: string;
  name: string;
  description: string | null;
  feeCents: number;
  freeOverCents: number | null;
  estimatedDays: string | null;
  isPickup: boolean;
};

export const getDeliveryMethods = cache(async (locale: Locale): Promise<DeliveryMethodDTO[]> => {
  const rows = await prisma.deliveryMethod.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return rows.map((d) => {
    const tr = pickTranslation({ name: d.name, description: d.description, estimatedDays: d.estimatedDays }, d.translations, locale);
    return {
      id: d.id,
      name: tr.name,
      description: tr.description,
      feeCents: toCents(d.fee),
      freeOverCents: d.freeOverAmount ? toCents(d.freeOverAmount) : null,
      estimatedDays: tr.estimatedDays,
      isPickup: d.isPickup,
    };
  });
});

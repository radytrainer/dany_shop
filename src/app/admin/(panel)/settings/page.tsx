import { requireAdminPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/services/settings";
import { PageHeader } from "@/components/admin/admin-ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { DeliveryMethodsManager, OptionsManager } from "@/components/admin/settings-extra";
import { translated } from "@/lib/translations";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdminPage("settings.manage");
  const [settings, methods, sizes, colors, usage] = await Promise.all([
    getStoreSettings(),
    prisma.deliveryMethod.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.size.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.color.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.productVariant.groupBy({ by: ["sizeId"], _count: { _all: true } }),
  ]);
  const colorUsage = await prisma.productVariant.groupBy({ by: ["colorId"], _count: { _all: true } });
  return (
    <div>
      <PageHeader title="Store settings" description="Changes apply to the storefront immediately." />
      <SettingsForm initial={settings} />
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <DeliveryMethodsManager
          methods={methods.map((m) => ({
            id: m.id,
            name: m.name,
            description: m.description ?? "",
            fee: m.fee.toFixed(2),
            freeOverAmount: m.freeOverAmount?.toFixed(2) ?? "",
            estimatedDays: m.estimatedDays ?? "",
            isPickup: m.isPickup,
            isActive: m.isActive,
            sortOrder: m.sortOrder,
            nameKm: translated("", m.translations, "km"),
            estimatedDaysKm: translated("", m.translations, "km", "estimatedDays"),
          }))}
        />
        <OptionsManager
          sizes={sizes.map((s) => ({ id: s.id, name: s.name, nameKm: translated("", s.translations, "km"), sortOrder: s.sortOrder, used: usage.find((u) => u.sizeId === s.id)?._count._all ?? 0 }))}
          colors={colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex, nameKm: translated("", c.translations, "km"), sortOrder: c.sortOrder, used: colorUsage.find((u) => u.colorId === c.id)?._count._all ?? 0 }))}
        />
      </div>
    </div>
  );
}

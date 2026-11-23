import { Compass } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { EmptyState } from "@/components/shared/empty-state";

export default async function StoreNotFound() {
  const { t } = await getI18n();
  return <EmptyState icon={Compass} title={t("common.notFoundTitle")} body={t("common.notFoundBody")} action={{ label: t("common.backHome"), href: "/" }} />;
}

import { PackageSearch } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { EmptyState } from "@/components/shared/empty-state";

export default async function OrderNotFound() {
  const { t } = await getI18n();
  return <EmptyState icon={PackageSearch} title={t("order.notFound")} body={t("order.notFoundBody")} action={{ label: t("nav.myOrders"), href: "/account/orders" }} />;
}

import { requireCustomerPage } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
import { AccountNav } from "@/components/account/account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCustomerPage("/account");
  const { t } = await getI18n();
  return (
    <div className="container-page py-8 sm:py-12">
      <p className="eyebrow">{t("account.title")}</p>
      <h1 className="mt-2 font-heading text-4xl sm:text-5xl">{t("account.hello", { name: user.name.split(" ")[0] })}</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-14">
        <AccountNav isStaff={user.role !== "CUSTOMER"} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

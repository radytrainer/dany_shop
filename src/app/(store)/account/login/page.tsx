import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/account/auth-forms";
import { safeNext } from "@/lib/safe-next";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("account.signIn"), robots: { index: false } };
}

export default async function LoginPage({ searchParams }: PageProps<"/account/login">) {
  const { t } = await getI18n();
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNext(sp.next, "/account") : undefined;
  if (await getCurrentUser()) redirect(next ?? "/account");
  return (
    <div className="container-page flex justify-center py-12 sm:py-20">
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-4xl">{t("account.signInTitle")}</h1>
        <p className="mt-2 mb-8 text-sm text-muted-foreground">{t("account.signInBody")}</p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}

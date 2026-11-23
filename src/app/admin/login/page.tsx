import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/permissions";
import { getStoreSettings } from "@/services/settings";
import { LoginForm } from "@/components/account/auth-forms";
import { BrandLogo } from "@/components/shared/brand-logo";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user && isStaffRole(user.role)) redirect("/admin");
  const settings = await getStoreSettings();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-sm rounded-sm border bg-background p-8">
        <BrandLogo logoUrl={settings.logoUrl} storeName={settings.storeName} priority className="h-10" textClassName="text-3xl" />
        <p className="mt-1 mb-8 text-sm text-muted-foreground">Store administration</p>
        <LoginForm scope="admin" next="/admin" />
      </div>
    </div>
  );
}

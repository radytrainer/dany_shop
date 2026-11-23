import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { getStoreSettings } from "@/services/settings";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage("dashboard.view");
  const settings = await getStoreSettings();
  return (
    <AdminShell user={{ name: user.name, email: user.email, role: user.role }} storeName={settings.storeName} logoUrl={settings.logoUrl}>
      {children}
    </AdminShell>
  );
}

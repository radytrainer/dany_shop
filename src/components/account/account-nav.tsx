"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { SignOutButton } from "./auth-forms";

export function AccountNav({ isStaff }: { isStaff: boolean }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const links = [
    { href: "/account", label: t("account.profile") },
    { href: "/account/orders", label: t("account.orders") },
    { href: "/account/addresses", label: t("account.addresses") },
    { href: "/wishlist", label: t("account.wishlist") },
  ];
  return (
    <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0" aria-label={t("account.title")}>
      {links.map((l) => {
        const active = l.href === "/account" ? pathname === "/account" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn("shrink-0 px-3 py-2.5 text-sm whitespace-nowrap", active ? "bg-foreground text-background" : "hover:bg-secondary")}
          >
            {l.label}
          </Link>
        );
      })}
      {isStaff && (
        <Link href="/admin" className="shrink-0 px-3 py-2.5 text-sm whitespace-nowrap text-brand hover:bg-secondary">
          Admin
        </Link>
      )}
      <SignOutButton className="shrink-0 px-3 py-2.5 text-left text-sm whitespace-nowrap text-muted-foreground hover:bg-secondary" />
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Boxes,
  ExternalLink,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  Layers,
  Menu,
  Package,
  ScrollText,
  Settings,
  Shirt,
  Tag,
  Users,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SignOutButton } from "@/components/account/auth-forms";
import { BrandLogo } from "@/components/shared/brand-logo";
import { cn } from "@/lib/utils";
import { can, type Permission } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/enums";

const NAV: { href: string; label: string; icon: typeof Package; permission: Permission }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/admin/orders", label: "Orders", icon: Package, permission: "orders.view" },
  { href: "/admin/products", label: "Products", icon: Shirt, permission: "products.view" },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, permission: "categories.manage" },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, permission: "inventory.view" },
  { href: "/admin/customers", label: "Customers", icon: Users, permission: "customers.view" },
  { href: "/admin/promotions", label: "Promotions", icon: Tag, permission: "promotions.manage" },
  { href: "/admin/content", label: "Banners & content", icon: ImageIcon, permission: "content.manage" },
  { href: "/admin/collections", label: "Collections", icon: Layers, permission: "content.manage" },
  { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings.manage" },
  { href: "/admin/activity", label: "Activity log", icon: ScrollText, permission: "logs.view" },
];

function NavList({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 p-3" aria-label="Admin">
      {NAV.filter((n) => can(role, n.permission)).map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-sm px-3 py-2 text-sm", active ? "bg-foreground text-background" : "text-foreground/80 hover:bg-sidebar-accent")}
          >
            <Icon className="size-4" strokeWidth={1.6} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  user,
  storeName,
  logoUrl,
  children,
}: {
  user: { name: string; email: string; role: Role };
  storeName: string;
  logoUrl: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-[#fafaf9]">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Link href="/admin" aria-label={`${storeName} admin`}>
            <BrandLogo logoUrl={logoUrl} storeName={storeName} className="h-7" textClassName="text-xl" />
          </Link>
          <span className="ml-2 rounded-sm bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">ADMIN</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavList role={user.role} />
        </div>
        <div className="border-t p-4 text-xs">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-muted-foreground">
            {user.email} · {user.role}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <Link href="/" target="_blank" className="inline-flex items-center gap-1 underline underline-offset-4">
              View store <ExternalLink className="size-3" />
            </Link>
            <SignOutButton redirectTo="/admin/login" className="text-muted-foreground underline underline-offset-4" />
          </div>
        </div>
      </aside>

      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open admin menu" className="-ml-2 p-2">
          <Menu className="size-5" />
        </button>
        <BrandLogo logoUrl={logoUrl} storeName={storeName} className="h-6" textClassName="text-lg" />
        <SignOutButton redirectTo="/admin/login" className="text-xs underline" />
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="border-b px-5 py-4 font-heading text-lg font-normal">{storeName} Admin</SheetTitle>
          <NavList role={user.role} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="lg:pl-60 print:pl-0">
        <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

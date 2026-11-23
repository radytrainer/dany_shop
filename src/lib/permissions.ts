import type { Role } from "@/generated/prisma/enums";

/** Role-based access control. Checked on the server for every admin page and API. */
export const PERMISSIONS = {
  "dashboard.view": ["ADMIN", "STAFF"],
  "products.view": ["ADMIN", "STAFF"],
  "products.manage": ["ADMIN"],
  "categories.manage": ["ADMIN"],
  "orders.view": ["ADMIN", "STAFF"],
  "orders.manage": ["ADMIN", "STAFF"],
  "customers.view": ["ADMIN", "STAFF"],
  "inventory.view": ["ADMIN", "STAFF"],
  "inventory.manage": ["ADMIN", "STAFF"],
  "promotions.manage": ["ADMIN"],
  "content.manage": ["ADMIN"],
  "settings.manage": ["ADMIN"],
  "users.manage": ["ADMIN"],
  "logs.view": ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export const isStaffRole = (role: Role | null | undefined) => role === "ADMIN" || role === "STAFF";

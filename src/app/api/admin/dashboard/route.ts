import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { getDashboardStats } from "@/services/admin-dashboard";

/** GET /api/admin/dashboard — KPIs and charts computed from real records. */
export const GET = adminRoute("dashboard.view", async () => ok(await getDashboardStats()));

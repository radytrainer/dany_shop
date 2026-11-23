import { z } from "zod";
import { ok, parseQuery } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { listAdminCustomers } from "@/services/admin-queries";

const schema = z.object({ q: z.string().trim().max(100).optional(), page: z.coerce.number().int().min(1).catch(1).default(1) });

/** GET /api/admin/customers — customers with order count, lifetime value and last order date. */
export const GET = adminRoute("customers.view", async (req) => ok(await listAdminCustomers(parseQuery(req, schema))));

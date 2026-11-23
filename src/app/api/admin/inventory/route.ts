import { z } from "zod";
import { ok, parseQuery } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { listAdminInventory } from "@/services/admin-queries";
import { getStoreSettings } from "@/services/settings";

const schema = z.object({
  q: z.string().trim().max(100).optional(),
  filter: z.enum(["all", "low", "out", "reserved"]).catch("all").default("all"),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

/** GET /api/admin/inventory — variant stock levels with low/out-of-stock filters. */
export const GET = adminRoute("inventory.view", async (req) => {
  const settings = await getStoreSettings();
  return ok(await listAdminInventory(parseQuery(req, schema), settings.lowStockThreshold));
});

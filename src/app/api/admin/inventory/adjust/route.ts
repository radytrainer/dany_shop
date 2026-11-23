import { ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { inventoryAdjustSchema } from "@/lib/validations/admin";
import { adjustStock } from "@/services/inventory";
import { logAdminActivity } from "@/services/audit";

/** POST /api/admin/inventory/adjust — manual stock adjustment with a mandatory reason (audited). */
export const POST = adminRoute("inventory.manage", async (req, _ctx, user) => {
  const { variantId, delta, reason } = await parseJson(req, inventoryAdjustSchema);
  const after = await adjustStock(variantId, delta, reason, user.id);
  await logAdminActivity({ userId: user.id, action: "inventory.adjust", entityType: "ProductVariant", entityId: variantId, metadata: { delta, reason, ...after }, ip: user.ip });
  return ok(after);
});

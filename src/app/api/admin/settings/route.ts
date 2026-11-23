import { ok, parseJson } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { settingsInputSchema } from "@/lib/validations/admin";
import { getStoreSettings } from "@/services/settings";
import { saveSettings } from "@/services/admin-content";

/** GET /api/admin/settings */
export const GET = adminRoute("settings.manage", async () => ok(await getStoreSettings()));

/** PUT /api/admin/settings — store, messaging, delivery/tax, inventory policy and homepage content. */
export const PUT = adminRoute("settings.manage", async (req, _ctx, user) => {
  const input = await parseJson(req, settingsInputSchema);
  await saveSettings(input, user);
  return ok({ updated: true });
});

import { ok, route } from "@/lib/api";
import { getStoreSettings, toPublicSettings } from "@/services/settings";
import { getDeliveryMethods } from "@/services/delivery";
import { getLocale } from "@/i18n/server";

/** GET /api/store-settings — public storefront configuration and active delivery methods. */
export const GET = route(async () => {
  const [settings, deliveryMethods] = await Promise.all([getStoreSettings(), getDeliveryMethods(await getLocale())]);
  return ok({ ...toPublicSettings(settings), deliveryMethods });
});

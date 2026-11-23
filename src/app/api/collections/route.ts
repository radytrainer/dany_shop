import { ok, route } from "@/lib/api";
import { getLocale } from "@/i18n/server";
import { listCollections } from "@/services/content";
import { getStoreSettings } from "@/services/settings";

/** GET /api/collections — active collections. */
export const GET = route(async () => ok((await getStoreSettings()).showCollections ? await listCollections(await getLocale()) : []));

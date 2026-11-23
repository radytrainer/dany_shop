import { z } from "zod";
import { ok, parseQuery, route } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security";
import { getLocale } from "@/i18n/server";
import { searchSuggestions } from "@/services/catalog";

const schema = z.object({ q: z.string().trim().min(1).max(100) });

/** GET /api/search?q= — instant search suggestions (products + categories). */
export const GET = route(async (req) => {
  enforceRateLimit(req, "search");
  const { q } = parseQuery(req, schema);
  return ok(await searchSuggestions(q, await getLocale()));
});

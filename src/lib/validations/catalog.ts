import { z } from "zod";
import { SORT_KEYS } from "@/types/catalog";

const csv = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean).slice(0, 30)));

const flag = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    const s = Array.isArray(v) ? v[0] : v;
    return s === "1" || s === "true";
  });

const money = z
  .string()
  .optional()
  .transform((v) => {
    if (!v || !/^\d{1,7}(\.\d{1,2})?$/.test(v)) return undefined;
    return v;
  });

/** Product listing query (shared by /shop pages and GET /api/products). */
export const productQuerySchema = z.object({
  category: z.string().max(100).optional(),
  collection: z.string().max(100).optional(),
  q: z.string().trim().max(100).optional(),
  sizes: csv,
  colors: csv,
  brands: csv,
  minPrice: money,
  maxPrice: money,
  inStock: flag,
  sale: flag,
  new: flag,
  sort: z.enum(SORT_KEYS as [string, ...string[]]).catch("newest").default("newest"),
  page: z.coerce.number().int().min(1).max(1000).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).catch(24).default(24),
});
export type ProductQuery = z.infer<typeof productQuerySchema>;

/** Convert Next.js searchParams into a plain record the schema can parse. */
export function searchParamsToRecord(sp: Record<string, string | string[] | undefined>) {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(sp)) if (v !== undefined) out[k] = v;
  return out;
}

/** A complete listing query from defaults plus overrides. */
export function buildProductQuery(overrides: Partial<ProductQuery> = {}): ProductQuery {
  return { ...productQuerySchema.parse({}), ...overrides };
}

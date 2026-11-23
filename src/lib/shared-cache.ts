import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";

/**
 * Cross-request cache for storefront reference data that changes rarely and only through the
 * admin: store settings, the category tree, promotions, banners, collections, delivery methods.
 * Before this, every page re-read all of it from Postgres (19–39 queries per page).
 *
 * Freshness:
 *  - every successful admin write clears the whole storefront cache (see adminRoute), so
 *    the shop shows a change on the next page load;
 *  - entries also expire after STOREFRONT_TTL seconds, covering changes made outside the
 *    admin (seed scripts, manual SQL).
 *
 * Never cache anything per-user, stock levels, or cart/checkout prices here. Cached values go
 * through JSON: return plain objects (no Map, Date or Decimal).
 */
export const STOREFRONT_TAG = "storefront";
export const STOREFRONT_TTL = 300;

// unstable_cache needs the Next.js runtime; unit/integration tests call services directly.
const enabled = !process.env.VITEST;

export function storefrontCache<A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string): (...args: A) => Promise<R> {
  if (!enabled) return fn;
  return unstable_cache(fn, ["storefront", key], { tags: [STOREFRONT_TAG], revalidate: STOREFRONT_TTL });
}

/** Clear cached storefront data. Called after every successful admin write. */
export function invalidateStorefrontCache() {
  if (!enabled) return;
  // expire: 0 — the next request reads fresh data (no stale-while-revalidate window).
  revalidateTag(STOREFRONT_TAG, { expire: 0 });
}

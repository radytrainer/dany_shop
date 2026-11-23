import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { forbidden, tooManyRequests } from "@/lib/api";

// ───────────────────────────── Client IP ─────────────────────────────

/** Client IP. Forwarded headers are only trusted behind our own reverse proxy. */
export function getClientIp(headers: Headers): string {
  if (process.env.TRUST_PROXY === "true") {
    const real = headers.get("x-real-ip");
    if (real) return real.trim();
    const fwd = headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
  }
  return "local";
}

// ───────────────────────────── Rate limiting ─────────────────────────────
// Fixed-window in-memory limiter. Suitable for the single-instance VPS
// deployment; swap for Redis if the app is ever horizontally scaled.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  bucket.count += 1;
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count) };
}

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  order: { limit: 10, windowMs: 10 * 60_000 },
  coupon: { limit: 30, windowMs: 10 * 60_000 },
  newsletter: { limit: 5, windowMs: 60 * 60_000 },
  search: { limit: 120, windowMs: 60_000 },
  quote: { limit: 240, windowMs: 60_000 },
  upload: { limit: 60, windowMs: 10 * 60_000 },
  receipt: { limit: 30, windowMs: 10 * 60_000 },
  write: { limit: 120, windowMs: 60_000 },
} as const;

export function enforceRateLimit(req: Request, name: keyof typeof RATE_LIMITS, extraKey = "") {
  if (process.env.DISABLE_RATE_LIMIT === "true" && process.env.NODE_ENV !== "production") return;
  const { limit, windowMs } = RATE_LIMITS[name];
  const ip = getClientIp(req.headers);
  const { allowed } = rateLimit(`${name}:${ip}:${extraKey}`, limit, windowMs);
  if (!allowed) throw tooManyRequests();
}

// ───────────────────────────── CSRF / origin check ─────────────────────────────
// Session cookies are SameSite=Lax. In addition, every state-changing API
// request must come from our own origin (Origin or Referer header).

export function assertSameOrigin(req: Request) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!host || !origin) throw forbidden("Missing request origin");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden("Invalid request origin");
  }
  const allowed = new Set([host]);
  if (process.env.APP_URL) {
    try {
      allowed.add(new URL(process.env.APP_URL).host);
    } catch {
      /* ignore malformed APP_URL here; env() validates it elsewhere */
    }
  }
  if (!allowed.has(originHost)) throw forbidden("Cross-origin request blocked");
}

// ───────────────────────────── Tokens ─────────────────────────────

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

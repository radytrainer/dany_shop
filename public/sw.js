/* DANY service worker — makes repeat visits fast and the installed app usable offline.
 *
 * What it caches (same-origin GET requests only):
 *  - /_next/static/*            cache-first   (file names are content-hashed, never change)
 *  - images, fonts, /brand/*    stale-while-revalidate, capped at MAX_MEDIA entries
 *  - /offline.html              precached, self-contained (no app JS), shown when a page cannot load offline
 *
 * What it never touches: HTML pages (they carry the visitor's session, bag and live stock),
 * /api/*, /admin/*, non-GET requests, other origins. Those always go to the network.
 *
 * Bump VERSION to drop every old cache on the next visit.
 */
const VERSION = "v3";
const STATIC_CACHE = `dany-static-${VERSION}`;
const MEDIA_CACHE = `dany-media-${VERSION}`;
const OFFLINE_CACHE = `dany-offline-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const MAX_MEDIA = 200;
const PRECACHE = [OFFLINE_URL, "/brand/logo-black.png", "/brand/pwa-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([STATIC_CACHE, MEDIA_CACHE, OFFLINE_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("dany-") && !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isMedia(url, request) {
  return (
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.startsWith("/brand/") ||
    request.destination === "image" ||
    request.destination === "font"
  );
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(MEDIA_CACHE);
  // Also look in the precache (e.g. the logo used by the offline page).
  const hit = (await cache.match(request)) || (await caches.match(request));
  const refresh = fetch(request)
    .then((res) => {
      if (res.ok && res.type === "basic") {
        cache.put(request, res.clone()).then(() => trim(MEDIA_CACHE, MAX_MEDIA));
      }
      return res;
    })
    .catch(() => hit);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return refresh;
}

async function pageWithOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch {
    const offline = await caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE });
    return offline || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;

  if (request.mode === "navigate") {
    event.respondWith(pageWithOfflineFallback(request));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (isMedia(url, request)) {
    event.respondWith(staleWhileRevalidate(request, event));
  }
  // Everything else (RSC payloads, page data): network only.
});

import type { MetadataRoute } from "next";

/**
 * Web app manifest: lets shoppers install the shop to their phone's home screen (PWA).
 * Served at /manifest.webmanifest. Static on purpose — the install name must not depend on the
 * database being reachable at build time.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DANY — Fashion, Siem Reap",
    short_name: "DANY",
    description: "Shop new and pre-loved fashion from Siem Reap. Order via Telegram or WhatsApp.",
    lang: "en",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/brand/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Shop all", short_name: "Shop", url: "/shop?source=pwa", icons: [{ src: "/brand/pwa-96.png", sizes: "96x96" }] },
      { name: "Second hand", short_name: "Pre-loved", url: "/categories/second-hand?source=pwa", icons: [{ src: "/brand/pwa-96.png", sizes: "96x96" }] },
      { name: "Bag", short_name: "Bag", url: "/cart?source=pwa", icons: [{ src: "/brand/pwa-96.png", sizes: "96x96" }] },
    ],
  };
}

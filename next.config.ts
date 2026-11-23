import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Next.js injects inline bootstrap scripts, so 'unsafe-inline' is required for
// script-src without a nonce. React's output escaping remains the main XSS defence.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // @react-pdf/renderer (fontkit, yoga) runs as a plain Node dependency, not bundled.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Receipt PDFs embed the Khmer-capable font; ship it with the standalone build.
  outputFileTracingIncludes: {
    "/api/orders/[orderNumber]/receipt": ["./assets/fonts/**/*"],
  },
  // Keep the standalone bundle lean: never trace tests, tooling output, uploads or backups.
  outputFileTracingExcludes: {
    "*": [
      "./tests/**",
      "./scripts/**",
      "./graphify-out/**",
      "./playwright-report/**",
      "./test-results/**",
      "./storage/**",
      "./backups/**",
      "./deploy/**",
      "./.agents/**",
      "./.claude/**",
      "./.windsurf/**",
      "./.env*",
      "./*.md",
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Development seed imagery only.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // PDF receipts: the HTML page policy (object-src 'none') must not block the browser's
      // built-in PDF viewer. A later entry overrides an earlier one for the same header key.
      { source: "/api/orders/:orderNumber/receipt", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" }] },
    ];
  },
};

export default nextConfig;

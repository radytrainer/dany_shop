import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans_Khmer, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import { getI18n, getLocale } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";
import { getStoreSettings, localizedSetting } from "@/services/settings";
import "./globals.css";

// Every page reads store settings and the visitor's language/session, so render on demand.
export const dynamic = "force-dynamic";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], display: "swap" });
const khmer = Noto_Sans_Khmer({ variable: "--font-khmer", subsets: ["khmer"], weight: ["400", "500", "600", "700"], display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const [settings, locale] = await Promise.all([getStoreSettings(), getLocale()]);
  const tagline = localizedSetting(settings, "tagline", locale);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return {
    metadataBase: new URL(appUrl),
    title: { default: `${settings.storeName} — ${tagline ?? "Modern fashion"}`, template: `%s | ${settings.storeName}` },
    description: tagline ?? "Modern fashion essentials.",
    icons: settings.faviconUrl ? { icon: settings.faviconUrl } : undefined,
    openGraph: {
      siteName: settings.storeName,
      type: "website",
      locale: locale === "km" ? "km_KH" : "en_US",
      images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: settings.storeName }],
    },
    twitter: { card: "summary_large_image", images: ["/brand/og-image.png"] },
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, t } = await getI18n();
  return (
    <html lang={locale} className={`${manrope.variable} ${playfair.variable} ${khmer.variable}`}>
      <body className="min-h-dvh">
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <Toaster position="top-center" containerAriaLabel={t("a11y.notifications")} toastOptions={{ className: "rounded-sm! font-sans!" }} />
      </body>
    </html>
  );
}

import Link from "next/link";
import { Send } from "lucide-react";
import { InstallAppButton } from "@/features/pwa/pwa";
import { FacebookIcon, InstagramIcon, TikTokIcon, YoutubeIcon } from "@/components/shared/brand-icons";
import { NewsletterForm } from "@/components/home/newsletter-form";
import { LanguageSwitcher } from "./language-switcher";
import { BrandLogo } from "@/components/shared/brand-logo";
import type { Translator } from "@/i18n/translator";
import type { StoreSettingsDTO } from "@/services/settings";
import type { NavGroup } from "./nav-types";

export function SiteFooter({
  settings,
  footerText,
  address,
  groups,
  showCollections,
  t,
}: {
  settings: StoreSettingsDTO;
  footerText: string | null;
  address: string | null;
  showCollections: boolean;
  groups: NavGroup[];
  t: Translator;
}) {
  const social = settings.socialLinks;
  const socials = [
    { href: social.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: social.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: social.tiktok, label: "TikTok", Icon: TikTokIcon },
    { href: social.telegram, label: "Telegram", Icon: Send },
    { href: social.youtube, label: "YouTube", Icon: YoutubeIcon },
  ].filter((s) => s.href);

  return (
    <footer className="mt-20 border-t bg-secondary pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.3fr_2fr] lg:py-20">
        <div>
          <BrandLogo logoUrl={settings.logoUrl} storeName={settings.storeName} className="h-10" textClassName="text-3xl" />
          {footerText && <p className="mt-3 max-w-sm text-sm text-muted-foreground">{footerText}</p>}
          <p className="mt-8 text-sm font-medium">{t("home.newsletterTitle")}</p>
          <p className="mt-1 mb-2 text-xs text-muted-foreground">{t("home.newsletterBody")}</p>
          <NewsletterForm />
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div>
            <p className="eyebrow mb-4 text-foreground">{t("footer.shop")}</p>
            <ul className="space-y-2.5 text-sm">
              {groups.map((g) => (
                <li key={g.key}>
                  <Link href={g.href} className="hover:underline">
                    {g.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/shop?new=1" className="hover:underline">
                  {t("nav.newArrivals")}
                </Link>
              </li>
              {showCollections && (
                <li>
                  <Link href="/collections" className="hover:underline">
                    {t("nav.collections")}
                  </Link>
                </li>
              )}
              <li>
                <Link href="/shop?sale=1" className="hover:underline">
                  {t("nav.sale")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-4 text-foreground">{t("footer.help")}</p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/help/how-to-order" className="hover:underline">
                  {t("footer.howToOrder")}
                </Link>
              </li>
              <li>
                <Link href="/help/shipping" className="hover:underline">
                  {t("footer.shippingInfo")}
                </Link>
              </li>
              <li>
                <Link href="/help/size-guide" className="hover:underline">
                  {t("footer.sizeGuide")}
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="hover:underline">
                  {t("footer.trackOrder")}
                </Link>
              </li>
              <li>
                <InstallAppButton className="hover:underline" />
              </li>
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="eyebrow mb-4 text-foreground">{t("footer.contact")}</p>
            <ul className="space-y-2.5 text-sm">
              {settings.contactPhone && (
                <li>
                  <a href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`} className="hover:underline">
                    {settings.contactPhone}
                  </a>
                </li>
              )}
              {settings.contactEmail && (
                <li>
                  <a href={`mailto:${settings.contactEmail}`} className="hover:underline">
                    {settings.contactEmail}
                  </a>
                </li>
              )}
              {settings.telegramUsername && (
                <li>
                  <a href={`https://t.me/${settings.telegramUsername}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Telegram @{settings.telegramUsername}
                  </a>
                </li>
              )}
              {address && <li className="text-muted-foreground">{address}</li>}
            </ul>
            {socials.length > 0 && (
              <>
                <p className="eyebrow mt-6 mb-3 text-foreground">{t("footer.followUs")}</p>
                <div className="flex gap-3">
                  {socials.map(({ href, label, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex size-9 items-center justify-center rounded-full border border-foreground/20 hover:border-foreground"
                    >
                      <Icon className="size-4" />
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {settings.storeName}. {t("footer.rights")}
          </p>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2 } from "lucide-react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

/** Short labels for the compact header toggle. */
const SHORT_LABELS: Record<Locale, string> = { en: "EN", km: "ខ្មែរ" };

function useChangeLocale() {
  const { locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const change = (next: Locale) => {
    if (next === locale) return;
    start(async () => {
      await api("/api/locale", { method: "POST", json: { locale: next } });
      document.documentElement.lang = next;
      router.refresh();
    });
  };
  return { locale, change, pending };
}

/** Full switcher (footer, mobile menu): "English / ខ្មែរ". */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useI18n();
  const { locale, change, pending } = useChangeLocale();
  return (
    <div className={cn("inline-flex items-center gap-1 text-xs", pending && "opacity-60", className)} aria-label={t("common.language")} role="group">
      <Globe className="mr-1 size-3.5" aria-hidden />
      {LOCALES.map((l, i) => (
        <span key={l} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground">/</span>}
          <button
            type="button"
            onClick={() => change(l)}
            aria-pressed={l === locale}
            lang={l}
            className={cn("px-0.5 underline-offset-4", l === locale ? "font-semibold underline" : "text-muted-foreground hover:text-foreground")}
          >
            {LOCALE_LABELS[l]}
          </button>
        </span>
      ))}
    </div>
  );
}

/** Compact header toggle: shows the *other* language, one tap to switch. */
export function LanguageToggle({ className }: { className?: string }) {
  const { t } = useI18n();
  const { locale, change, pending } = useChangeLocale();
  const other = LOCALES.find((l) => l !== locale) ?? "en";
  return (
    <button
      type="button"
      onClick={() => change(other)}
      disabled={pending}
      lang={other}
      title={`${t("a11y.switchLanguage")}: ${LOCALE_LABELS[other]}`}
      aria-label={`${t("a11y.switchLanguage")}: ${LOCALE_LABELS[other]}`}
      data-testid="language-toggle"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border border-foreground/15 px-2.5 text-[11px] font-semibold tracking-wide transition-colors hover:border-foreground disabled:opacity-60",
        className,
      )}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Globe className="size-3.5" aria-hidden />}
      {SHORT_LABELS[other]}
    </button>
  );
}

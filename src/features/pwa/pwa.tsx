"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

// ───────────────────────────── Install state (shared) ─────────────────────────────
// Chrome/Edge/Samsung Internet fire `beforeinstallprompt` when the site is installable; we keep
// the event so our own button can open the native install dialog later. iOS has no such event:
// installing is manual (Safari → Share → Add to Home Screen), so we show instructions instead.

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own, less intrusive prompt
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
}

type Platform = "promptable" | "ios-safari" | "ios-other" | "none";

function readPlatform(): Platform {
  if (installed) return "none";
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "none";
  if (deferred) return "promptable";
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  if (!ios) return "none";
  // In-app browsers (Facebook, Instagram, LINE, Telegram…) and Chrome/Firefox on iOS cannot install.
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|Line\/|Telegram/.test(ua);
  return safari ? "ios-safari" : "ios-other";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useInstallPlatform(): Platform {
  return useSyncExternalStore(subscribe, readPlatform, () => "none");
}

async function promptInstall() {
  if (!deferred) return;
  const event = deferred;
  deferred = null; // a prompt event can only be used once
  emit();
  await event.prompt();
  await event.userChoice.catch(() => undefined);
}

// ───────────────────────────── Service worker ─────────────────────────────

/** Registers /sw.js in production (in development it would cache build files across reloads). */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}

// ───────────────────────────── iOS instructions ─────────────────────────────

function IosInstallDialog({ open, onOpenChange, platform }: { open: boolean; onOpenChange: (v: boolean) => void; platform: Platform }) {
  const { t } = useI18n();
  const [before, after] = t("pwa.iosStep1").split("{icon}");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("pwa.iosTitle")}</DialogTitle>
        </DialogHeader>
        {platform === "ios-other" ? (
          <p className="text-sm">{t("pwa.iosNotSafari")}</p>
        ) : (
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs text-background">1</span>
              <span>
                {before}
                <Share className="mx-1 inline size-4 -translate-y-0.5 text-[#007aff]" aria-label="Share" />
                {after}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs text-background">2</span>
              <span className="flex items-start gap-1.5">
                <SquarePlus className="mt-0.5 size-4 shrink-0" aria-hidden />
                {t("pwa.iosStep2")}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs text-background">3</span>
              <span>{t("pwa.iosStep3")}</span>
            </li>
          </ol>
        )}
        <Button className="mt-2 h-11 rounded-sm" onClick={() => onOpenChange(false)}>
          {t("pwa.gotIt")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function useInstallAction() {
  const platform = useInstallPlatform();
  const [iosOpen, setIosOpen] = useState(false);
  const start = () => {
    if (platform === "promptable") void promptInstall();
    else if (platform === "ios-safari" || platform === "ios-other") setIosOpen(true);
  };
  const dialog = <IosInstallDialog open={iosOpen} onOpenChange={setIosOpen} platform={platform} />;
  return { platform, start, dialog };
}

// ───────────────────────────── "Install app" link (menu, footer) ─────────────────────────────

export function InstallAppButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const { platform, start, dialog } = useInstallAction();
  if (platform === "none") return null;
  return (
    <>
      <button type="button" onClick={start} className={cn("inline-flex items-center gap-2", className)} data-testid="install-app">
        <Download className="size-4" aria-hidden /> {t("pwa.installApp")}
      </button>
      {dialog}
    </>
  );
}

// ───────────────────────────── Install banner ─────────────────────────────

const DISMISS_KEY = "dany-pwa-dismissed-at";
const DISMISS_DAYS = 14;
const SHOW_AFTER_MS = 12_000;
// Pages with their own bottom bar (add to bag, checkout) or where a banner would get in the way.
const HIDDEN_ON = [/^\/products\//, /^\/cart/, /^\/checkout/, /^\/orders\//, /^\/account\/(login|register)/];

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/** Small card above the bottom navigation, shown once the shopper has spent a little time in the shop. */
export function InstallBanner() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { platform, start, dialog } = useInstallAction();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (recentlyDismissed()) return;
    const id = setTimeout(() => setReady(true), SHOW_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
  };

  const visible = ready && !dismissed && platform !== "none" && platform !== "ios-other" && !HIDDEN_ON.some((r) => r.test(pathname));

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-x-3 bottom-[calc(56px+env(safe-area-inset-bottom)+12px)] z-40 mx-auto max-w-md border bg-background p-4 shadow-xl md:bottom-6"
            role="dialog"
            aria-label={t("pwa.installTitle")}
            data-testid="install-banner"
          >
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon, no optimisation needed */}
              <img src="/brand/pwa-96.png" alt="" width={44} height={44} className="size-11 shrink-0 rounded-[10px]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t("pwa.installTitle")}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("pwa.installBody")}</p>
              </div>
              <button type="button" onClick={dismiss} className="-m-1 p-1 text-muted-foreground hover:text-foreground" aria-label={t("pwa.notNow")}>
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" className="h-9 rounded-sm text-xs" onClick={dismiss}>
                {t("pwa.notNow")}
              </Button>
              <Button
                className="h-9 rounded-sm text-xs"
                onClick={() => {
                  start();
                  if (platform === "promptable") dismiss();
                }}
              >
                <Download className="size-3.5" /> {t("pwa.install")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {dialog}
    </>
  );
}

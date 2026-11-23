"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/fetcher";
import type { StoreSettingsDTO } from "@/services/settings";
import { apiErrorMessage, Card, Field, ImageField, ImageUploadButton, Toggle, inputCls, textareaCls } from "./admin-ui";

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero campaign",
  categories: "Shop by category",
  newArrivals: "New arrivals",
  promo: "Promotional banner",
  bestSellers: "Best sellers",
  collections: "Featured collections",
  trending: "Trending products",
  offers: "Special offers",
  editorial: "Lookbook / editorial",
  newsletter: "Newsletter",
  social: "Instagram / social gallery",
};

const KM_FIELDS = [
  ["tagline", "Tagline"],
  ["announcementText", "Announcement text"],
  ["footerText", "Footer text"],
  ["address", "Address"],
  ["shippingInfo", "Shipping information"],
  ["sizeGuide", "Size guide"],
] as const;

export function SettingsForm({ initial }: { initial: StoreSettingsDTO }) {
  const router = useRouter();
  const [s, setS] = useState({
    ...initial,
    tagline: initial.tagline ?? "",
    khrExchangeRate: initial.khrExchangeRate ?? "",
    telegramUsername: initial.telegramUsername ?? "",
    messengerUrl: initial.messengerUrl ?? "",
    whatsappNumber: initial.whatsappNumber ?? "",
    minOrderAmount: initial.minOrderAmount ?? "",
    contactEmail: initial.contactEmail ?? "",
    contactPhone: initial.contactPhone ?? "",
    address: initial.address ?? "",
    footerText: initial.footerText ?? "",
    shippingInfo: initial.shippingInfo ?? "",
    sizeGuide: initial.sizeGuide ?? "",
    announcementText: initial.announcementText ?? "",
    announcementHref: initial.announcementHref ?? "",
    km: initial.translations.km ?? {},
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((x) => ({ ...x, [k]: v }));
  const social = (k: keyof StoreSettingsDTO["socialLinks"]) => s.socialLinks[k] ?? "";

  function moveSection(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= s.homepageSections.length) return;
    const list = [...s.homepageSections];
    [list[i], list[j]] = [list[j], list[i]];
    set("homepageSections", list);
  }

  async function save() {
    setBusy(true);
    const nul = (v: string) => (v.trim() ? v.trim() : null);
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        json: {
          storeName: s.storeName,
          tagline: nul(s.tagline),
          logoUrl: s.logoUrl,
          faviconUrl: s.faviconUrl,
          currency: s.currency,
          defaultLocale: s.defaultLocale,
          khrExchangeRate: nul(s.khrExchangeRate),
          showKhrEquivalent: s.showKhrEquivalent,
          telegramUsername: nul(s.telegramUsername),
          messengerUrl: nul(s.messengerUrl),
          whatsappNumber: nul(s.whatsappNumber),
          defaultChannel: s.defaultChannel,
          minOrderAmount: nul(s.minOrderAmount),
          taxEnabled: s.taxEnabled,
          taxRate: s.taxRate,
          taxLabel: s.taxLabel,
          reservationHours: s.reservationHours,
          deductStockOn: s.deductStockOn,
          lowStockThreshold: s.lowStockThreshold,
          contactEmail: nul(s.contactEmail),
          contactPhone: nul(s.contactPhone),
          address: nul(s.address),
          socialLinks: Object.fromEntries(Object.entries(s.socialLinks).map(([k, v]) => [k, v ? v : null])),
          footerText: nul(s.footerText),
          shippingInfo: nul(s.shippingInfo),
          sizeGuide: nul(s.sizeGuide),
          announcementActive: s.announcementActive,
          showCollections: s.showCollections,
          announcementText: nul(s.announcementText),
          announcementHref: nul(s.announcementHref),
          translations: { km: Object.fromEntries(Object.entries(s.km).filter(([, v]) => v && v.trim())) },
          homepageSections: s.homepageSections,
          socialGallery: s.socialGallery.map((g) => ({ imageUrl: g.imageUrl, href: g.href || null })),
        },
      });
      toast.success("Settings saved");
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <h2 className="mb-4 text-sm font-semibold">Store</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Store name">
            <input value={s.storeName} onChange={(e) => set("storeName", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Tagline">
            <input value={s.tagline} onChange={(e) => set("tagline", e.target.value)} className={inputCls} />
          </Field>
          <ImageField label="Logo (optional — text logo otherwise)" value={s.logoUrl} onChange={(v) => set("logoUrl", v)} folder="store" />
          <ImageField label="Favicon" value={s.faviconUrl} onChange={(v) => set("faviconUrl", v)} folder="store" />
          <Field label="Currency" hint="Prices are stored in this currency">
            <select value={s.currency} onChange={(e) => set("currency", e.target.value)} className={inputCls}>
              <option value="USD">USD ($)</option>
              <option value="KHR">KHR (៛)</option>
            </select>
          </Field>
          <Field label="Default language">
            <select value={s.defaultLocale} onChange={(e) => set("defaultLocale", e.target.value)} className={inputCls}>
              <option value="en">English</option>
              <option value="km">ខ្មែរ (Khmer)</option>
            </select>
          </Field>
          <Field label="KHR per USD (fixed rate you set)" hint="Never updated automatically">
            <input value={s.khrExchangeRate} onChange={(e) => set("khrExchangeRate", e.target.value)} inputMode="decimal" className={inputCls} />
          </Field>
          <div className="flex items-end">
            <Toggle checked={s.showKhrEquivalent} onChange={(v) => set("showKhrEquivalent", v)} label="Show approximate KHR totals" />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold">Order messaging</h2>
        <p className="mb-4 text-xs text-muted-foreground">Customers send their saved order to you through these channels. Leave a channel empty to hide it.</p>
        <div className="grid gap-3">
          <Field label="Telegram username" hint="Without @ — e.g. danyshop">
            <input value={s.telegramUsername} onChange={(e) => set("telegramUsername", e.target.value)} className={inputCls} />
          </Field>
          <Field label="WhatsApp number" hint="International format, digits only — e.g. 85512345678">
            <input value={s.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} inputMode="tel" className={inputCls} />
          </Field>
          <Field label="Facebook Messenger link" hint="e.g. https://m.me/yourpage">
            <input value={s.messengerUrl} onChange={(e) => set("messengerUrl", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Default channel">
            <select value={s.defaultChannel} onChange={(e) => set("defaultChannel", e.target.value as typeof s.defaultChannel)} className={inputCls}>
              <option value="TELEGRAM">Telegram</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="MESSENGER">Messenger</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold">Checkout, tax & inventory</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Minimum order amount (optional)">
            <input value={s.minOrderAmount} onChange={(e) => set("minOrderAmount", e.target.value)} inputMode="decimal" className={inputCls} />
          </Field>
          <div className="flex items-end">
            <Toggle checked={s.taxEnabled} onChange={(v) => set("taxEnabled", v)} label="Charge tax" />
          </div>
          <Field label="Tax rate (%)">
            <input value={s.taxRate} onChange={(e) => set("taxRate", e.target.value)} inputMode="decimal" className={inputCls} disabled={!s.taxEnabled} />
          </Field>
          <Field label="Tax label">
            <input value={s.taxLabel} onChange={(e) => set("taxLabel", e.target.value)} className={inputCls} disabled={!s.taxEnabled} />
          </Field>
          <Field label="Hold stock for unconfirmed orders (hours)" hint="Released automatically after this period">
            <input type="number" min={1} value={s.reservationHours} onChange={(e) => set("reservationHours", Number(e.target.value) || 1)} className={inputCls} />
          </Field>
          <Field label="Deduct stock permanently when order is">
            <select value={s.deductStockOn} onChange={(e) => set("deductStockOn", e.target.value as typeof s.deductStockOn)} className={inputCls}>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PAYMENT_RECEIVED">Payment received</option>
              <option value="SHIPPED">Shipped</option>
            </select>
          </Field>
          <Field label="Low-stock alert threshold">
            <input type="number" min={0} value={s.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Number(e.target.value) || 0)} className={inputCls} />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold">Contact & social</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Contact email">
            <input value={s.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Contact phone">
            <input value={s.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input value={s.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
          </Field>
          {(["instagram", "facebook", "tiktok", "telegram", "youtube"] as const).map((k) => (
            <Field key={k} label={`${k[0].toUpperCase()}${k.slice(1)} URL`}>
              <input value={social(k)} onChange={(e) => set("socialLinks", { ...s.socialLinks, [k]: e.target.value })} className={inputCls} placeholder="https://" />
            </Field>
          ))}
        </div>
      </Card>

      <Card className="xl:col-span-2" >
        <h2 id="homepage" className="mb-4 text-sm font-semibold">
          Homepage & announcement
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium">Section order & visibility</p>
            <ul className="divide-y rounded-sm border">
              {s.homepageSections.map((sec, i) => (
                <li key={sec.key} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="flex-1">{SECTION_LABELS[sec.key]}</span>
                  <button type="button" onClick={() => moveSection(i, -1)} disabled={i === 0} className="p-1 disabled:opacity-30" aria-label="Move up">
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => moveSection(i, 1)} disabled={i === s.homepageSections.length - 1} className="p-1 disabled:opacity-30" aria-label="Move down">
                    <ArrowDown className="size-3.5" />
                  </button>
                  <Toggle checked={sec.enabled} onChange={(v) => set("homepageSections", s.homepageSections.map((x, j) => (j === i ? { ...x, enabled: v } : x)))} label="" />
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <Toggle checked={s.showCollections} onChange={(v) => set("showCollections", v)} label="Show Collections (menu link, pages and homepage section)" />
            <Toggle checked={s.announcementActive} onChange={(v) => set("announcementActive", v)} label="Show announcement bar" />
            <Field label="Announcement text">
              <input value={s.announcementText} onChange={(e) => set("announcementText", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Announcement link (optional)">
              <input value={s.announcementHref} onChange={(e) => set("announcementHref", e.target.value)} className={inputCls} placeholder="/shop?sale=1" />
            </Field>
            <Field label="Footer text">
              <input value={s.footerText} onChange={(e) => set("footerText", e.target.value)} className={inputCls} />
            </Field>
            <div>
              <p className="mb-2 text-xs font-medium">Social gallery (homepage, up to 6 shown)</p>
              <div className="grid grid-cols-3 gap-2">
                {s.socialGallery.map((g, i) => (
                  <div key={`${g.imageUrl}-${i}`} className="relative">
                    <div className="relative aspect-square bg-secondary">
                      <Image src={g.imageUrl} alt="" fill sizes="120px" className="object-cover" />
                    </div>
                    <button type="button" onClick={() => set("socialGallery", s.socialGallery.filter((_, j) => j !== i))} className="absolute top-1 right-1 rounded-full bg-white p-0.5" aria-label="Remove">
                      <X className="size-3" />
                    </button>
                    <input value={g.href ?? ""} onChange={(e) => set("socialGallery", s.socialGallery.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} placeholder="Post URL" className="mt-1 h-7 w-full rounded-sm border px-1.5 text-[11px]" />
                  </div>
                ))}
              </div>
              <ImageUploadButton multiple folder="banners" label="Add images" className="mt-2" onUploaded={(imgs) => set("socialGallery", [...s.socialGallery, ...imgs.map((i) => ({ imageUrl: i.url, href: "" }))].slice(0, 12))} />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold">Shipping info & size guide</h2>
        <div className="grid gap-3">
          <Field label="Shipping & returns (product pages, help page)">
            <textarea value={s.shippingInfo} onChange={(e) => set("shippingInfo", e.target.value)} rows={5} className={textareaCls} />
          </Field>
          <Field label="Size guide" hint="Use | to make a table, one row per line: Size | Chest (cm) | Waist (cm)">
            <textarea value={s.sizeGuide} onChange={(e) => set("sizeGuide", e.target.value)} rows={7} className={textareaCls + " font-mono text-xs"} />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold">Khmer content</h2>
        <div className="grid gap-3">
          {KM_FIELDS.map(([k, label]) => (
            <Field key={k} label={`${label} (ខ្មែរ)`}>
              {k === "shippingInfo" || k === "sizeGuide" ? (
                <textarea lang="km" value={s.km[k] ?? ""} onChange={(e) => set("km", { ...s.km, [k]: e.target.value })} rows={3} className={textareaCls} />
              ) : (
                <input lang="km" value={s.km[k] ?? ""} onChange={(e) => set("km", { ...s.km, [k]: e.target.value })} className={inputCls} />
              )}
            </Field>
          ))}
        </div>
      </Card>

      <div className="sticky bottom-4 xl:col-span-2">
        <Button onClick={save} disabled={busy} className="h-11 w-full rounded-sm shadow-lg sm:w-auto sm:px-10" data-testid="save-settings">
          {busy && <Loader2 className="size-4 animate-spin" />} Save settings
        </Button>
      </div>
    </div>
  );
}

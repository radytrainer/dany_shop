"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/fetcher";
import { apiErrorMessage, Card, Field, Toggle, inputCls } from "./admin-ui";

type Opt = { id: string; name: string };
type Scope = "ALL" | "CATEGORY" | "PRODUCT";
type Kind = "PERCENTAGE" | "FIXED";
type Coupon = {
  id?: string;
  code: string;
  description: string;
  type: Kind;
  value: string;
  scope: Scope;
  categoryIds: string[];
  productIds: string[];
  minOrderAmount: string;
  maxDiscount: string;
  startsAt: string;
  expiresAt: string;
  usageLimit: string;
  usageCount?: number;
  isActive: boolean;
};
type Promo = { id?: string; name: string; type: Kind; value: string; scope: Scope; categoryIds: string[]; productIds: string[]; startsAt: string; endsAt: string; isActive: boolean };

const fmtValue = (type: Kind, v: string, currency: string) => (type === "PERCENTAGE" ? `${Number(v)}% off` : `${currency === "USD" ? "$" : ""}${v}${currency === "KHR" ? "៛" : ""} off`);
const toIso = (s: string) => (s ? new Date(s).toISOString() : null);
/** ISO (UTC) → value for <input type="datetime-local"> in the browser's timezone. */
const toLocalInput = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function status(isActive: boolean, start: string, end: string) {
  const now = Date.now();
  if (!isActive) return { label: "Inactive", cls: "bg-neutral-100 text-neutral-600" };
  if (start && new Date(start).getTime() > now) return { label: "Scheduled", cls: "bg-sky-50 text-sky-800" };
  if (end && new Date(end).getTime() < now) return { label: "Expired", cls: "bg-neutral-100 text-neutral-600" };
  return { label: "Active", cls: "bg-emerald-50 text-emerald-800" };
}

function ScopePicker({ scope, categoryIds, productIds, categories, products, onChange }: { scope: Scope; categoryIds: string[]; productIds: string[]; categories: Opt[]; products: Opt[]; onChange: (p: { scope?: Scope; categoryIds?: string[]; productIds?: string[] }) => void }) {
  const [filter, setFilter] = useState("");
  const list = scope === "CATEGORY" ? categories : products;
  const selected = scope === "CATEGORY" ? categoryIds : productIds;
  const shown = useMemo(() => list.filter((o) => o.name.toLowerCase().includes(filter.toLowerCase())).slice(0, 200), [list, filter]);
  return (
    <div className="space-y-2">
      <Field label="Applies to">
        <select value={scope} onChange={(e) => onChange({ scope: e.target.value as Scope })} className={inputCls}>
          <option value="ALL">Entire order / all products</option>
          <option value="CATEGORY">Specific categories (includes subcategories)</option>
          <option value="PRODUCT">Specific products</option>
        </select>
      </Field>
      {scope !== "ALL" && (
        <div className="rounded-sm border p-2">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" className="mb-2 h-8 w-full rounded-sm border px-2 text-xs" />
          <div className="max-h-44 space-y-1 overflow-y-auto">
            {shown.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="size-3.5 accent-foreground"
                  checked={selected.includes(o.id)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...selected, o.id] : selected.filter((x) => x !== o.id);
                    onChange(scope === "CATEGORY" ? { categoryIds: next } : { productIds: next });
                  }}
                />
                {o.name}
              </label>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{selected.length} selected</p>
        </div>
      )}
    </div>
  );
}

export function PromotionsManager({ coupons, promotions, categories, products, currency }: { coupons: Coupon[]; promotions: Promo[]; categories: Opt[]; products: Opt[]; currency: string }) {
  const router = useRouter();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [promo, setPromo] = useState<Promo | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveCoupon() {
    if (!coupon) return;
    setBusy(true);
    try {
      const payload = {
        ...coupon,
        minOrderAmount: coupon.minOrderAmount || null,
        maxDiscount: coupon.maxDiscount || null,
        startsAt: toIso(coupon.startsAt),
        expiresAt: toIso(coupon.expiresAt),
        usageLimit: coupon.usageLimit || null,
        description: coupon.description || null,
      };
      if (coupon.id) await api(`/api/admin/coupons/${coupon.id}`, { method: "PUT", json: payload });
      else await api("/api/admin/coupons", { method: "POST", json: payload });
      toast.success("Coupon saved");
      setCoupon(null);
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function savePromo() {
    if (!promo) return;
    setBusy(true);
    try {
      const payload = { ...promo, startsAt: toIso(promo.startsAt), endsAt: toIso(promo.endsAt) };
      if (promo.id) await api(`/api/admin/promotions/${promo.id}`, { method: "PUT", json: payload });
      else await api("/api/admin/promotions", { method: "POST", json: payload });
      toast.success("Promotion saved");
      setPromo(null);
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(url: string, label: string) {
    if (!window.confirm(`Delete ${label}?`)) return;
    try {
      const res = await api<{ result?: string }>(url, { method: "DELETE" });
      toast.success(res.result === "deactivated" ? "Used in orders — deactivated instead" : "Deleted");
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  return (
    <div className="space-y-8">
      <Card className="p-0">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-sm font-semibold">Coupon codes</h2>
          <Button className="h-9 rounded-sm" onClick={() => setCoupon({ code: "", description: "", type: "PERCENTAGE", value: "", scope: "ALL", categoryIds: [], productIds: [], minOrderAmount: "", maxDiscount: "", startsAt: "", expiresAt: "", usageLimit: "", isActive: true })}>
            <Plus className="size-4" /> New coupon
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="border-y bg-secondary/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Code</th>
              <th className="px-4 py-2.5 font-medium">Discount</th>
              <th className="px-4 py-2.5 font-medium">Conditions</th>
              <th className="px-4 py-2.5 font-medium">Used</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const s = status(c.isActive, c.startsAt, c.expiresAt);
              return (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-mono font-medium">
                    {c.code}
                    {c.description && <p className="font-sans text-xs font-normal text-muted-foreground">{c.description}</p>}
                  </td>
                  <td className="px-4 py-2.5">{fmtValue(c.type, c.value, currency)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {c.scope === "ALL" ? "All products" : c.scope === "CATEGORY" ? `${c.categoryIds.length} categories` : `${c.productIds.length} products`}
                    {c.minOrderAmount && ` · min ${c.minOrderAmount}`}
                    {c.maxDiscount && ` · max ${c.maxDiscount}`}
                    {c.expiresAt && ` · until ${c.expiresAt.slice(0, 10)}`}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {c.usageCount}
                    {c.usageLimit && ` / ${c.usageLimit}`}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-sm px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button type="button" onClick={() => setCoupon({ ...c, startsAt: toLocalInput(c.startsAt), expiresAt: toLocalInput(c.expiresAt) })} className="p-1.5 hover:bg-secondary" aria-label={`Edit ${c.code}`}>
                      <Pencil className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => remove(`/api/admin/coupons/${c.id}`, c.code)} className="p-1.5 text-destructive hover:bg-destructive/10" aria-label={`Delete ${c.code}`}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No coupons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="p-0">
        <div className="flex items-center justify-between p-4">
          <div>
            <h2 className="text-sm font-semibold">Automatic promotions</h2>
            <p className="text-xs text-muted-foreground">Shown as sale prices in the store. When several apply, the customer gets the single best one.</p>
          </div>
          <Button className="h-9 rounded-sm" onClick={() => setPromo({ name: "", type: "PERCENTAGE", value: "", scope: "CATEGORY", categoryIds: [], productIds: [], startsAt: "", endsAt: "", isActive: true })}>
            <Plus className="size-4" /> New promotion
          </Button>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {promotions.map((p) => {
              const s = status(p.isActive, p.startsAt, p.endsAt);
              return (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2.5 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5">{fmtValue(p.type, p.value, currency)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {p.scope === "ALL" ? "All products" : p.scope === "CATEGORY" ? `${p.categoryIds.length} categories` : `${p.productIds.length} products`}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-sm px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button type="button" onClick={() => setPromo({ ...p, startsAt: toLocalInput(p.startsAt), endsAt: toLocalInput(p.endsAt) })} className="p-1.5 hover:bg-secondary" aria-label={`Edit ${p.name}`}>
                      <Pencil className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => remove(`/api/admin/promotions/${p.id}`, p.name)} className="p-1.5 text-destructive hover:bg-destructive/10" aria-label={`Delete ${p.name}`}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {promotions.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground">No automatic promotions.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {coupon && (
        <Dialog open onOpenChange={(o) => !o && setCoupon(null)}>
          <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-sm sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{coupon.id ? "Edit coupon" : "New coupon"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Code">
                  <input value={coupon.code} onChange={(e) => setCoupon({ ...coupon, code: e.target.value.toUpperCase() })} className={inputCls + " font-mono"} />
                </Field>
                <Field label="Type">
                  <select value={coupon.type} onChange={(e) => setCoupon({ ...coupon, type: e.target.value as Kind })} className={inputCls}>
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed amount</option>
                  </select>
                </Field>
              </div>
              <Field label={coupon.type === "PERCENTAGE" ? "Percent off" : `Amount off (${currency})`}>
                <input value={coupon.value} onChange={(e) => setCoupon({ ...coupon, value: e.target.value })} inputMode="decimal" className={inputCls} />
              </Field>
              <Field label="Description (internal)">
                <input value={coupon.description} onChange={(e) => setCoupon({ ...coupon, description: e.target.value })} className={inputCls} />
              </Field>
              <ScopePicker scope={coupon.scope} categoryIds={coupon.categoryIds} productIds={coupon.productIds} categories={categories} products={products} onChange={(p) => setCoupon({ ...coupon, ...p })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Minimum order (optional)">
                  <input value={coupon.minOrderAmount} onChange={(e) => setCoupon({ ...coupon, minOrderAmount: e.target.value })} inputMode="decimal" className={inputCls} />
                </Field>
                <Field label="Max discount (optional)" hint="For percentage coupons">
                  <input value={coupon.maxDiscount} onChange={(e) => setCoupon({ ...coupon, maxDiscount: e.target.value })} inputMode="decimal" className={inputCls} />
                </Field>
                <Field label="Starts">
                  <input type="datetime-local" value={coupon.startsAt} onChange={(e) => setCoupon({ ...coupon, startsAt: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Expires">
                  <input type="datetime-local" value={coupon.expiresAt} onChange={(e) => setCoupon({ ...coupon, expiresAt: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Usage limit (optional)">
                  <input value={coupon.usageLimit} onChange={(e) => setCoupon({ ...coupon, usageLimit: e.target.value })} inputMode="numeric" className={inputCls} />
                </Field>
              </div>
              <Toggle checked={coupon.isActive} onChange={(v) => setCoupon({ ...coupon, isActive: v })} label="Active" />
              <Button onClick={saveCoupon} disabled={busy} className="h-10 rounded-sm">
                {busy && <Loader2 className="size-4 animate-spin" />} Save coupon
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {promo && (
        <Dialog open onOpenChange={(o) => !o && setPromo(null)}>
          <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-sm sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{promo.id ? "Edit promotion" : "New promotion"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <Field label="Name">
                <input value={promo.name} onChange={(e) => setPromo({ ...promo, name: e.target.value })} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <select value={promo.type} onChange={(e) => setPromo({ ...promo, type: e.target.value as Kind })} className={inputCls}>
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed amount per item</option>
                  </select>
                </Field>
                <Field label="Value">
                  <input value={promo.value} onChange={(e) => setPromo({ ...promo, value: e.target.value })} inputMode="decimal" className={inputCls} />
                </Field>
              </div>
              <ScopePicker scope={promo.scope} categoryIds={promo.categoryIds} productIds={promo.productIds} categories={categories} products={products} onChange={(p) => setPromo({ ...promo, ...p })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts">
                  <input type="datetime-local" value={promo.startsAt} onChange={(e) => setPromo({ ...promo, startsAt: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Ends">
                  <input type="datetime-local" value={promo.endsAt} onChange={(e) => setPromo({ ...promo, endsAt: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <Toggle checked={promo.isActive} onChange={(v) => setPromo({ ...promo, isActive: v })} label="Active" />
              <Button onClick={savePromo} disabled={busy} className="h-10 rounded-sm">
                {busy && <Loader2 className="size-4 animate-spin" />} Save promotion
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

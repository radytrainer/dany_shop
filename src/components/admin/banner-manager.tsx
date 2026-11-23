"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/fetcher";
import { apiErrorMessage, Card, Field, ImageField, Toggle, inputCls, textareaCls } from "./admin-ui";

type Placement = "HERO" | "PROMO" | "EDITORIAL";
type Banner = {
  id?: string;
  placement: Placement;
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  km: Record<string, string>;
};

const SECTIONS: { key: Placement; title: string; hint: string }[] = [
  { key: "HERO", title: "Hero slides", hint: "Large campaign images at the top of the homepage (rotate automatically)." },
  { key: "PROMO", title: "Promotional banner", hint: "Full-width banner between product sections (the first active one is shown)." },
  { key: "EDITORIAL", title: "Lookbook / editorial", hint: "Three editorial tiles (the first is the large one)." },
];

const toLocalInput = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function BannerManager({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);

  const blank = (placement: Placement): Banner => ({
    placement, title: "", subtitle: "", description: "", ctaLabel: "", ctaHref: "", secondaryCtaLabel: "", secondaryCtaHref: "",
    imageUrl: "", mobileImageUrl: null, sortOrder: banners.filter((b) => b.placement === placement).length, isActive: true, startsAt: "", endsAt: "", km: {},
  });

  async function save() {
    if (!edit) return;
    setBusy(true);
    try {
      const payload = {
        ...edit,
        startsAt: edit.startsAt ? new Date(edit.startsAt).toISOString() : null,
        endsAt: edit.endsAt ? new Date(edit.endsAt).toISOString() : null,
        subtitle: edit.subtitle || null,
        description: edit.description || null,
        ctaLabel: edit.ctaLabel || null,
        ctaHref: edit.ctaHref || null,
        secondaryCtaLabel: edit.secondaryCtaLabel || null,
        secondaryCtaHref: edit.secondaryCtaHref || null,
      };
      if (edit.id) await api(`/api/admin/banners/${edit.id}`, { method: "PUT", json: payload });
      else await api("/api/admin/banners", { method: "POST", json: payload });
      toast.success("Banner saved");
      setEdit(null);
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(b: Banner) {
    if (!window.confirm(`Delete "${b.title}"?`)) return;
    try {
      await api(`/api/admin/banners/${b.id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  const km = (k: string) => edit?.km[k] ?? "";
  const setKm = (k: string, v: string) => edit && setEdit({ ...edit, km: { ...edit.km, [k]: v } });

  return (
    <div className="space-y-6">
      {SECTIONS.map((s) => {
        const list = banners.filter((b) => b.placement === s.key);
        return (
          <Card key={s.key}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">{s.title}</h2>
                <p className="text-xs text-muted-foreground">{s.hint}</p>
              </div>
              <Button className="h-9 rounded-sm" onClick={() => setEdit(blank(s.key))}>
                <Plus className="size-4" /> Add
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((b) => (
                <div key={b.id} className={`overflow-hidden rounded-sm border ${b.isActive ? "" : "opacity-50"}`}>
                  <div className="relative aspect-[16/9] bg-secondary">
                    <Image src={b.imageUrl} alt="" fill sizes="360px" className="object-cover" />
                  </div>
                  <div className="flex items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{b.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Order {b.sortOrder} {!b.isActive && "· inactive"} {b.endsAt && `· until ${b.endsAt.slice(0, 10)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0">
                      <button type="button" onClick={() => setEdit({ ...b, startsAt: toLocalInput(b.startsAt), endsAt: toLocalInput(b.endsAt) })} className="p-1.5 hover:bg-secondary" aria-label={`Edit ${b.title}`}>
                        <Pencil className="size-3.5" />
                      </button>
                      <button type="button" onClick={() => remove(b)} className="p-1.5 text-destructive hover:bg-destructive/10" aria-label={`Delete ${b.title}`}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {list.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
            </div>
          </Card>
        );
      })}

      {edit && (
        <Dialog open onOpenChange={(o) => !o && setEdit(null)}>
          <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-sm sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{edit.id ? "Edit banner" : "New banner"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Placement">
                <select value={edit.placement} onChange={(e) => setEdit({ ...edit, placement: e.target.value as Placement })} className={inputCls}>
                  {SECTIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Display order">
                <input type="number" min={0} value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) || 0 })} className={inputCls} />
              </Field>
              <Field label="Title" className="sm:col-span-2">
                <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Eyebrow / subtitle">
                <input value={edit.subtitle} onChange={(e) => setEdit({ ...edit, subtitle: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <textarea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} rows={2} className={textareaCls} />
              </Field>
              <Field label="Button label">
                <input value={edit.ctaLabel} onChange={(e) => setEdit({ ...edit, ctaLabel: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Button link" hint="e.g. /shop?sale=1">
                <input value={edit.ctaHref} onChange={(e) => setEdit({ ...edit, ctaHref: e.target.value })} className={inputCls} />
              </Field>
              {edit.placement === "HERO" && (
                <>
                  <Field label="Second button label">
                    <input value={edit.secondaryCtaLabel} onChange={(e) => setEdit({ ...edit, secondaryCtaLabel: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Second button link">
                    <input value={edit.secondaryCtaHref} onChange={(e) => setEdit({ ...edit, secondaryCtaHref: e.target.value })} className={inputCls} />
                  </Field>
                </>
              )}
              <ImageField label="Image (desktop)" value={edit.imageUrl || null} onChange={(v) => setEdit({ ...edit, imageUrl: v ?? "" })} />
              <ImageField label="Image (mobile, optional)" value={edit.mobileImageUrl} onChange={(v) => setEdit({ ...edit, mobileImageUrl: v })} />
              <Field label="Show from (optional)">
                <input type="datetime-local" value={edit.startsAt} onChange={(e) => setEdit({ ...edit, startsAt: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Show until (optional)">
                <input type="datetime-local" value={edit.endsAt} onChange={(e) => setEdit({ ...edit, endsAt: e.target.value })} className={inputCls} />
              </Field>
              <div className="rounded-sm border p-3 sm:col-span-2">
                <p className="mb-2 text-xs font-medium">Khmer text (optional — falls back to English)</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["title", "subtitle", "description", "ctaLabel", "secondaryCtaLabel"] as const).map((k) => (
                    <input key={k} lang="km" placeholder={k} value={km(k)} onChange={(e) => setKm(k, e.target.value)} className={inputCls} />
                  ))}
                </div>
              </div>
              <Toggle checked={edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} label="Active" />
              <Button onClick={save} disabled={busy || !edit.title || !edit.imageUrl} className="h-10 rounded-sm sm:col-span-2">
                {busy && <Loader2 className="size-4 animate-spin" />} Save banner
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/fetcher";
import { apiErrorMessage, Card, Field, ImageField, Toggle, inputCls, textareaCls } from "./admin-ui";

type Collection = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  bannerUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  productIds: string[];
  km: Record<string, string>;
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s_-]+/g, "-");

export function CollectionManager({ collections, products }: { collections: Collection[]; products: { id: string; name: string }[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Collection | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const shown = useMemo(() => products.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase())), [products, filter]);

  async function save() {
    if (!edit) return;
    setBusy(true);
    try {
      const payload = { ...edit, slug: edit.slug || slugify(edit.name), description: edit.description || null };
      if (edit.id) await api(`/api/admin/collections/${edit.id}`, { method: "PUT", json: payload });
      else await api("/api/admin/collections", { method: "POST", json: payload });
      toast.success("Collection saved");
      setEdit(null);
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Collection) {
    if (!window.confirm(`Delete collection "${c.name}"? Products are not deleted.`)) return;
    try {
      await api(`/api/admin/collections/${c.id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button className="h-10 rounded-sm" onClick={() => setEdit({ name: "", slug: "", description: "", imageUrl: null, bannerUrl: null, isActive: true, isFeatured: false, sortOrder: collections.length, productIds: [], km: {} })}>
          <Plus className="size-4" /> New collection
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {collections.map((c) => (
          <Card key={c.id} className={`p-0 ${c.isActive ? "" : "opacity-50"}`}>
            <div className="relative aspect-[16/9] bg-secondary">{c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="400px" className="object-cover" />}</div>
            <div className="flex items-start justify-between gap-2 p-4">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  /collections/{c.slug} · {c.productIds.length} products {c.isFeatured && "· featured"}
                </p>
              </div>
              <div className="flex shrink-0">
                <button type="button" onClick={() => setEdit(c)} className="p-1.5 hover:bg-secondary" aria-label={`Edit ${c.name}`}>
                  <Pencil className="size-3.5" />
                </button>
                <button type="button" onClick={() => remove(c)} className="p-1.5 text-destructive hover:bg-destructive/10" aria-label={`Delete ${c.name}`}>
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {edit && (
        <Dialog open onOpenChange={(o) => !o && setEdit(null)}>
          <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-sm sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{edit.id ? "Edit collection" : "New collection"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Slug">
                <input value={edit.slug} placeholder={slugify(edit.name)} onChange={(e) => setEdit({ ...edit, slug: e.target.value.toLowerCase() })} className={inputCls} />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <textarea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} rows={2} className={textareaCls} />
              </Field>
              <ImageField label="Card image" value={edit.imageUrl} onChange={(v) => setEdit({ ...edit, imageUrl: v })} />
              <ImageField label="Banner image" value={edit.bannerUrl} onChange={(v) => setEdit({ ...edit, bannerUrl: v })} />
              <Field label="Name (ខ្មែរ)">
                <input lang="km" value={edit.km.name ?? ""} onChange={(e) => setEdit({ ...edit, km: { ...edit.km, name: e.target.value } })} className={inputCls} />
              </Field>
              <Field label="Description (ខ្មែរ)">
                <input lang="km" value={edit.km.description ?? ""} onChange={(e) => setEdit({ ...edit, km: { ...edit.km, description: e.target.value } })} className={inputCls} />
              </Field>
              <Field label="Display order">
                <input type="number" min={0} value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) || 0 })} className={inputCls} />
              </Field>
              <div className="flex items-end gap-6">
                <Toggle checked={edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} label="Active" />
                <Toggle checked={edit.isFeatured} onChange={(v) => setEdit({ ...edit, isFeatured: v })} label="Featured" />
              </div>
              <div className="rounded-sm border p-2 sm:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">Products ({edit.productIds.length} selected, in selection order)</p>
                  <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter products…" className="h-8 w-48 rounded-sm border px-2 text-xs" />
                </div>
                <div className="max-h-56 space-y-1 overflow-y-auto">
                  {shown.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="size-3.5 accent-foreground"
                        checked={edit.productIds.includes(p.id)}
                        onChange={(e) => setEdit({ ...edit, productIds: e.target.checked ? [...edit.productIds, p.id] : edit.productIds.filter((x) => x !== p.id) })}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={save} disabled={busy || !edit.name} className="h-10 rounded-sm sm:col-span-2">
                {busy && <Loader2 className="size-4 animate-spin" />} Save collection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

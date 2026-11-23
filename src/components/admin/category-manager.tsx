"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/fetcher";
import { apiErrorMessage, Card, Field, ImageField, Toggle, inputCls, textareaCls } from "./admin-ui";

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  nameKm: string;
  descriptionKm: string;
  productCount: number;
  childCount: number;
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s_-]+/g, "-");

export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<AdminCategory> | null>(null);
  const roots = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  async function move(list: AdminCategory[], index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((c) => c.id);
    [ids[index], ids[j]] = [ids[j], ids[index]];
    try {
      await api("/api/admin/categories/reorder", { method: "POST", json: { ids } });
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  async function toggleActive(c: AdminCategory) {
    try {
      await api(`/api/admin/categories/${c.id}`, { method: "PUT", json: toPayload({ ...c, isActive: !c.isActive }) });
      toast.success(c.isActive ? "Category deactivated" : "Category activated");
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  async function remove(c: AdminCategory) {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    try {
      await api(`/api/admin/categories/${c.id}`, { method: "DELETE" });
      toast.success("Category deleted");
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  const Row = ({ c, list, index, depth }: { c: AdminCategory; list: AdminCategory[]; index: number; depth: number }) => (
    <div className={`flex items-center gap-3 border-t px-4 py-2.5 text-sm ${c.isActive ? "" : "opacity-50"}`} style={{ paddingLeft: 16 + depth * 28 }}>
      <div className="relative size-10 shrink-0 overflow-hidden rounded-sm bg-secondary">{c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="40px" className="object-cover" />}</div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {c.name} {c.nameKm && <span className="ml-1 text-xs font-normal text-muted-foreground">· {c.nameKm}</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          /{c.slug} · {c.productCount} products{c.isFeatured && " · featured"}
          {!c.isActive && " · inactive"}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => move(list, index, -1)} disabled={index === 0} className="p-1.5 hover:bg-secondary disabled:opacity-30" aria-label="Move up">
          <ArrowUp className="size-3.5" />
        </button>
        <button type="button" onClick={() => move(list, index, 1)} disabled={index === list.length - 1} className="p-1.5 hover:bg-secondary disabled:opacity-30" aria-label="Move down">
          <ArrowDown className="size-3.5" />
        </button>
        <Toggle checked={c.isActive} onChange={() => toggleActive(c)} label="" />
        <button type="button" onClick={() => setEditing(c)} className="p-1.5 hover:bg-secondary" aria-label={`Edit ${c.name}`}>
          <Pencil className="size-3.5" />
        </button>
        <button type="button" onClick={() => remove(c)} className="p-1.5 text-destructive hover:bg-destructive/10" aria-label={`Delete ${c.name}`}>
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button className="h-10 rounded-sm" onClick={() => setEditing({ isActive: true, isFeatured: false, parentId: null })}>
          <Plus className="size-4" /> New category
        </Button>
      </div>
      <Card className="p-0">
        {roots.map((root, i) => (
          <div key={root.id}>
            <Row c={root} list={roots} index={i} depth={0} />
            {childrenOf(root.id).map((child, j, arr) => (
              <Row key={child.id} c={child} list={arr} index={j} depth={1} />
            ))}
            <button
              type="button"
              onClick={() => setEditing({ parentId: root.id, isActive: true, isFeatured: false })}
              className="flex w-full items-center gap-1.5 border-t px-4 py-2 text-xs text-muted-foreground hover:bg-secondary/50"
              style={{ paddingLeft: 44 }}
            >
              <Plus className="size-3.5" /> Add subcategory to {root.name}
            </button>
          </div>
        ))}
        {roots.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">No categories yet.</p>}
      </Card>
      {editing && <CategoryDialog initial={editing} roots={roots} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />}
    </>
  );
}

function toPayload(c: Partial<AdminCategory>) {
  return {
    name: c.name ?? "",
    slug: c.slug ?? "",
    description: c.description || null,
    parentId: c.parentId ?? null,
    imageUrl: c.imageUrl ?? null,
    bannerUrl: c.bannerUrl ?? null,
    sortOrder: c.sortOrder ?? 0,
    isActive: c.isActive ?? true,
    isFeatured: c.isFeatured ?? false,
    nameKm: c.nameKm || null,
    descriptionKm: c.descriptionKm || null,
  };
}

function CategoryDialog({ initial, roots, onClose, onSaved }: { initial: Partial<AdminCategory>; roots: AdminCategory[]; onClose: () => void; onSaved: () => void }) {
  const [c, setC] = useState<Partial<AdminCategory>>(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof AdminCategory>(k: K, v: AdminCategory[K]) => setC((s) => ({ ...s, [k]: v }));
  const isRootWithChildren = !!initial.id && (initial.childCount ?? 0) > 0;

  async function save() {
    setBusy(true);
    try {
      const payload = toPayload({ ...c, slug: c.slug || slugify(c.name ?? "") });
      if (c.id) await api(`/api/admin/categories/${c.id}`, { method: "PUT", json: payload });
      else await api("/api/admin/categories", { method: "POST", json: payload });
      toast.success("Category saved");
      onSaved();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-sm sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{c.id ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Name">
            <input value={c.name ?? ""} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Slug" hint="Used in the URL: /categories/slug">
            <input value={c.slug ?? ""} placeholder={slugify(c.name ?? "")} onChange={(e) => set("slug", e.target.value.toLowerCase())} className={inputCls} />
          </Field>
          <Field label="Parent">
            <select value={c.parentId ?? ""} disabled={isRootWithChildren} onChange={(e) => set("parentId", e.target.value || null)} className={inputCls}>
              <option value="">— Top level —</option>
              {roots.filter((r) => r.id !== c.id).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea value={c.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={2} className={textareaCls} />
          </Field>
          <ImageField label="Category image (tiles & menu)" value={c.imageUrl ?? null} onChange={(v) => set("imageUrl", v)} folder="categories" />
          <ImageField label="Banner image (category page header)" value={c.bannerUrl ?? null} onChange={(v) => set("bannerUrl", v)} folder="categories" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name (ខ្មែរ)">
              <input value={c.nameKm ?? ""} onChange={(e) => set("nameKm", e.target.value)} className={inputCls} lang="km" />
            </Field>
            <Field label="Description (ខ្មែរ)">
              <input value={c.descriptionKm ?? ""} onChange={(e) => set("descriptionKm", e.target.value)} className={inputCls} lang="km" />
            </Field>
          </div>
          <div className="flex gap-6">
            <Toggle checked={c.isActive ?? true} onChange={(v) => set("isActive", v)} label="Active" />
            <Toggle checked={c.isFeatured ?? false} onChange={(v) => set("isFeatured", v)} label="Featured" />
          </div>
          <Button onClick={save} disabled={busy || !c.name} className="h-10 rounded-sm">
            {busy && <Loader2 className="size-4 animate-spin" />} Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

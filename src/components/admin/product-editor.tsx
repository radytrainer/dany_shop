"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Star, Trash2, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiClientError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { Card, Field, ImageUploadButton, Toggle, inputCls, textareaCls } from "./admin-ui";

type Option = { id: string; name: string };
type Options = {
  categories: { id: string; label: string; isLeaf: boolean }[];
  sizes: Option[];
  colors: (Option & { hex: string })[];
  collections: Option[];
};

type ImageRow = { id?: string; url: string; storageKey: string | null; alt: string; colorId: string | null };
type VariantRow = { id?: string; sizeId: string; colorId: string; sku: string; priceOverride: string; stock: number; reserved: number; isActive: boolean };

export type EditorInitial = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  brand: string;
  price: string;
  salePrice: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  tags: string[];
  lowStockThreshold: number;
  condition: "NEW_WITH_TAGS" | "LIKE_NEW" | "EXCELLENT" | "GOOD" | "FAIR" | null;
  km: { name: string; shortDescription: string; description: string };
  images: ImageRow[];
  featuredImageIndex: number;
  variants: VariantRow[];
  collectionIds: string[];
};

const EMPTY: Omit<EditorInitial, "id"> = {
  name: "",
  slug: "",
  sku: "",
  shortDescription: "",
  description: "",
  categoryId: "",
  brand: "",
  price: "",
  salePrice: "",
  status: "DRAFT",
  isFeatured: false,
  isNewArrival: true,
  isBestSeller: false,
  tags: [],
  lowStockThreshold: 5,
  condition: null,
  km: { name: "", shortDescription: "", description: "" },
  images: [],
  featuredImageIndex: 0,
  variants: [],
  collectionIds: [],
};

const code = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "X";

export function ProductEditor({ options, initial, readOnly = false }: { options: Options; initial: EditorInitial | null; readOnly?: boolean }) {
  const router = useRouter();
  const [f, setF] = useState<Omit<EditorInitial, "id">>(initial ?? EMPTY);
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const usedSizes = useMemo(() => new Set(f.variants.map((v) => v.sizeId)), [f.variants]);
  const usedColors = useMemo(() => new Set(f.variants.map((v) => v.colorId)), [f.variants]);
  const [pickSizes, setPickSizes] = useState<Set<string>>(new Set(usedSizes));
  const [pickColors, setPickColors] = useState<Set<string>>(new Set(usedColors));
  const sizeName = (id: string) => options.sizes.find((s) => s.id === id)?.name ?? "?";
  const color = (id: string) => options.colors.find((c) => c.id === id);
  const err = (k: string) => errors[k];

  function generateVariants() {
    const rows = [...f.variants];
    for (const colorId of pickColors) {
      for (const sizeId of pickSizes) {
        if (rows.some((r) => r.sizeId === sizeId && r.colorId === colorId)) continue;
        rows.push({
          sizeId,
          colorId,
          sku: `${(f.sku || "SKU").toUpperCase()}-${code(color(colorId)?.name ?? "")}-${sizeName(sizeId).replace(/\s+/g, "").toUpperCase()}`,
          priceOverride: "",
          stock: 0,
          reserved: 0,
          isActive: true,
        });
      }
    }
    const sizeOrder = new Map(options.sizes.map((s, i) => [s.id, i]));
    const colorOrder = new Map(options.colors.map((c, i) => [c.id, i]));
    rows.sort((a, b) => (colorOrder.get(a.colorId)! - colorOrder.get(b.colorId)!) || (sizeOrder.get(a.sizeId)! - sizeOrder.get(b.sizeId)!));
    set("variants", rows);
  }

  function updateVariant(i: number, patch: Partial<VariantRow>) {
    set("variants", f.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  }

  function moveImage(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= f.images.length) return;
    const imgs = [...f.images];
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    let featured = f.featuredImageIndex;
    if (featured === i) featured = j;
    else if (featured === j) featured = i;
    setF((s) => ({ ...s, images: imgs, featuredImageIndex: featured }));
  }

  async function save() {
    setSaving(true);
    setErrors({});
    const payload = {
      ...f,
      slug: f.slug.trim(),
      salePrice: f.salePrice.trim() || null,
      brand: f.brand || null,
      shortDescription: f.shortDescription || null,
      tags: tagsText.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      translations: { km: { name: f.km.name || null, shortDescription: f.km.shortDescription || null, description: f.km.description || null } },
      images: f.images.map((i) => ({ ...i, alt: i.alt || null })),
      variants: f.variants.map(({ reserved: _r, ...v }) => ({ ...v, priceOverride: v.priceOverride.trim() || null })),
    };
    try {
      if (initial) {
        await api(`/api/admin/products/${initial.id}`, { method: "PUT", json: payload });
        toast.success("Product saved");
        router.refresh();
      } else {
        const { id } = await api<{ id: string }>("/api/admin/products", { method: "POST", json: payload });
        toast.success("Product created");
        router.replace(`/admin/products/${id}`);
      }
    } catch (e) {
      if (e instanceof ApiClientError && e.fields) {
        setErrors(e.fields);
        toast.error("Please fix the highlighted fields");
      } else toast.error(e instanceof ApiClientError ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial || !window.confirm("Delete this product? Products with order history are archived instead.")) return;
    setDeleting(true);
    try {
      const { result } = await api<{ result: "deleted" | "archived" }>(`/api/admin/products/${initial.id}`, { method: "DELETE" });
      toast.success(result === "archived" ? "Product has orders — archived instead of deleted" : "Product deleted");
      router.replace("/admin/products");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not delete");
      setDeleting(false);
    }
  }

  const errorList = Object.entries(errors);

  return (
    <fieldset disabled={readOnly} className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-6">
        {errorList.length > 0 && (
          <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <p className="font-medium">Some fields need attention:</p>
            <ul className="mt-1 list-disc pl-5 text-xs">
              {errorList.slice(0, 8).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Card>
          <h2 className="mb-4 text-sm font-semibold">Basics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={err("name")} className="sm:col-span-2">
              <input value={f.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
            </Field>
            <Field label="SKU" error={err("sku")}>
              <input value={f.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} className={inputCls} />
            </Field>
            <Field label="URL slug" hint="Leave empty to generate from the name" error={err("slug")}>
              <input value={f.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} className={inputCls} />
            </Field>
            <Field label="Category" error={err("categoryId")}>
              <select value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={inputCls}>
                <option value="">Choose…</option>
                {options.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Brand (optional)" error={err("brand")}>
              <input value={f.brand} onChange={(e) => set("brand", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Short description" error={err("shortDescription")} className="sm:col-span-2">
              <input value={f.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Description" error={err("description")} className="sm:col-span-2">
              <textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={6} className={textareaCls} />
            </Field>
            <Field label="Tags (comma separated)" hint="Used by search, e.g. summer, linen, dress" className="sm:col-span-2">
              <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold">Images</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {f.images.map((img, i) => (
              <div key={img.url} className={cn("rounded-sm border p-2", f.featuredImageIndex === i && "border-foreground")}>
                <div className="relative aspect-[3/4] bg-secondary">
                  <Image src={img.url} alt="" fill sizes="160px" className="object-cover" />
                  {f.featuredImageIndex === i && <span className="absolute top-1 left-1 bg-foreground px-1.5 py-0.5 text-[10px] text-background">Featured</span>}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveImage(i, -1)} aria-label="Move left" className="p-1 hover:bg-secondary">
                      <ArrowLeft className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => moveImage(i, 1)} aria-label="Move right" className="p-1 hover:bg-secondary">
                      <ArrowRight className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => set("featuredImageIndex", i)} aria-label="Set as featured" className="p-1 hover:bg-secondary">
                      <Star className={cn("size-3.5", f.featuredImageIndex === i && "fill-foreground")} />
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove image"
                    className="p-1 text-destructive hover:bg-destructive/10"
                    onClick={() =>
                      setF((s) => ({
                        ...s,
                        images: s.images.filter((_, j) => j !== i),
                        featuredImageIndex: s.featuredImageIndex === i ? 0 : s.featuredImageIndex > i ? s.featuredImageIndex - 1 : s.featuredImageIndex,
                      }))
                    }
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <select
                  value={img.colorId ?? ""}
                  onChange={(e) => set("images", f.images.map((x, j) => (j === i ? { ...x, colorId: e.target.value || null } : x)))}
                  className="mt-1 h-8 w-full rounded-sm border px-1 text-xs"
                  aria-label="Linked colour"
                >
                  <option value="">Any colour</option>
                  {[...usedColors].map((cid) => (
                    <option key={cid} value={cid}>
                      {color(cid)?.name}
                    </option>
                  ))}
                </select>
                <input
                  value={img.alt}
                  onChange={(e) => set("images", f.images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                  placeholder="Alt text"
                  className="mt-1 h-8 w-full rounded-sm border px-2 text-xs"
                />
              </div>
            ))}
          </div>
          {!readOnly && (
            <ImageUploadButton
              multiple
              label="Upload images"
              className="mt-3"
              onUploaded={(imgs) => set("images", [...f.images, ...imgs.map((i) => ({ url: i.url, storageKey: i.storageKey, alt: "", colorId: null }))].slice(0, 20))}
            />
          )}
          <p className="mt-2 text-xs text-muted-foreground">JPEG, PNG, WebP or AVIF. The star marks the main image; link images to a colour to switch them when shoppers choose that colour.</p>
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold">Sizes, colours & stock</h2>
          <p className="mb-4 text-xs text-muted-foreground">Pick sizes and colours, generate combinations, then set stock per variant. Customers can only order in-stock variants.</p>
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-medium">Sizes</p>
              <div className="flex flex-wrap gap-1.5">
                {options.sizes.map((s) => {
                  const on = pickSizes.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setPickSizes((p) => (on ? new Set([...p].filter((x) => x !== s.id)) : new Set([...p, s.id])))}
                      className={cn("h-8 min-w-10 rounded-sm border px-2 text-xs", on ? "border-foreground bg-foreground text-background" : "hover:border-foreground")}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium">Colours</p>
              <div className="flex flex-wrap gap-1.5">
                {options.colors.map((c) => {
                  const on = pickColors.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPickColors((p) => (on ? new Set([...p].filter((x) => x !== c.id)) : new Set([...p, c.id])))}
                      className={cn("inline-flex h-8 items-center gap-1.5 rounded-sm border px-2 text-xs", on ? "border-foreground bg-foreground text-background" : "hover:border-foreground")}
                    >
                      <span className="size-3 rounded-full border border-black/20" style={{ backgroundColor: c.hex }} />
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button type="button" variant="outline" className="h-9 rounded-sm text-xs" onClick={generateVariants} disabled={pickSizes.size === 0 || pickColors.size === 0}>
              <Wand2 className="size-4" /> Generate missing combinations
            </Button>
          </div>
          {err("variants") && <p className="mt-2 text-xs text-destructive">{err("variants")}</p>}
          {f.variants.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-2 font-medium">Variant</th>
                    <th className="py-2 pr-2 font-medium">SKU</th>
                    <th className="py-2 pr-2 font-medium">Price override</th>
                    <th className="py-2 pr-2 font-medium">Stock</th>
                    <th className="py-2 pr-2 font-medium">Reserved</th>
                    <th className="py-2 pr-2 font-medium">Active</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {f.variants.map((v, i) => (
                    <tr key={`${v.colorId}-${v.sizeId}`} className="border-t">
                      <td className="py-1.5 pr-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-3 rounded-full border border-black/20" style={{ backgroundColor: color(v.colorId)?.hex }} />
                          {color(v.colorId)?.name} / {sizeName(v.sizeId)}
                        </span>
                      </td>
                      <td className="py-1.5 pr-2">
                        <input value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value.toUpperCase() })} className={cn("h-8 w-44 rounded-sm border px-2", err(`variants.${i}.sku`) && "border-destructive")} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input value={v.priceOverride} onChange={(e) => updateVariant(i, { priceOverride: e.target.value })} placeholder="—" inputMode="decimal" className="h-8 w-20 rounded-sm border px-2" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          type="number"
                          min={v.reserved}
                          value={v.stock}
                          onChange={(e) => updateVariant(i, { stock: Math.max(0, Number(e.target.value) || 0) })}
                          className="h-8 w-20 rounded-sm border px-2 tabular-nums"
                        />
                      </td>
                      <td className="py-1.5 pr-2 text-muted-foreground tabular-nums">{v.reserved}</td>
                      <td className="py-1.5 pr-2">
                        <input type="checkbox" checked={v.isActive} onChange={(e) => updateVariant(i, { isActive: e.target.checked })} className="size-4 accent-foreground" />
                      </td>
                      <td className="py-1.5">
                        <button type="button" aria-label="Remove variant" onClick={() => set("variants", f.variants.filter((_, j) => j !== i))} className="p-1 text-destructive">
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">Stock changes are recorded in the inventory history. Variants that have orders are deactivated instead of deleted.</p>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold">Khmer translation (optional)</h2>
          <div className="grid gap-4">
            <Field label="Name (ខ្មែរ)">
              <input value={f.km.name} onChange={(e) => set("km", { ...f.km, name: e.target.value })} className={inputCls} lang="km" />
            </Field>
            <Field label="Short description (ខ្មែរ)">
              <input value={f.km.shortDescription} onChange={(e) => set("km", { ...f.km, shortDescription: e.target.value })} className={inputCls} lang="km" />
            </Field>
            <Field label="Description (ខ្មែរ)">
              <textarea value={f.km.description} onChange={(e) => set("km", { ...f.km, description: e.target.value })} rows={4} className={textareaCls} lang="km" />
            </Field>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <h2 className="mb-4 text-sm font-semibold">Publishing</h2>
          <Field label="Status">
            <select value={f.status} onChange={(e) => set("status", e.target.value as typeof f.status)} className={inputCls}>
              <option value="DRAFT">Draft (hidden)</option>
              <option value="ACTIVE">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </Field>
          <div className="mt-4 flex flex-col gap-3">
            <Toggle checked={f.isFeatured} onChange={(v) => set("isFeatured", v)} label="Featured" />
            <Toggle checked={f.isNewArrival} onChange={(v) => set("isNewArrival", v)} label="New arrival" />
            <Toggle checked={f.isBestSeller} onChange={(v) => set("isBestSeller", v)} label="Best seller" />
          </div>
        </Card>
        <Card>
          <h2 className="mb-1 text-sm font-semibold">Second hand</h2>
          <p className="mb-3 text-xs text-muted-foreground">For pre-loved items, choose a condition grade. It shows as a badge and on the product page.</p>
          <Field label="Condition">
            <select value={f.condition ?? ""} onChange={(e) => set("condition", (e.target.value || null) as typeof f.condition)} className={inputCls} data-testid="condition-select">
              <option value="">New stock (not second hand)</option>
              <option value="NEW_WITH_TAGS">New with tags</option>
              <option value="LIKE_NEW">Like new</option>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
            </select>
          </Field>
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold">Pricing</h2>
          <div className="grid gap-4">
            <Field label="Regular price" error={err("price")}>
              <input value={f.price} onChange={(e) => set("price", e.target.value)} inputMode="decimal" className={inputCls} />
            </Field>
            <Field label="Sale price (optional)" error={err("salePrice")} hint="Must be lower than the regular price">
              <input value={f.salePrice} onChange={(e) => set("salePrice", e.target.value)} inputMode="decimal" className={inputCls} />
            </Field>
            <Field label="Low-stock alert at" error={err("lowStockThreshold")}>
              <input type="number" min={0} value={f.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Number(e.target.value) || 0)} className={inputCls} />
            </Field>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Collections</h2>
          <div className="space-y-2">
            {options.collections.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-foreground"
                  checked={f.collectionIds.includes(c.id)}
                  onChange={(e) => set("collectionIds", e.target.checked ? [...f.collectionIds, c.id] : f.collectionIds.filter((x) => x !== c.id))}
                />
                {c.name}
              </label>
            ))}
            {options.collections.length === 0 && <p className="text-xs text-muted-foreground">No collections yet.</p>}
          </div>
        </Card>
        {!readOnly && (
          <div className="sticky bottom-4 space-y-2">
            <Button onClick={save} disabled={saving} className="h-11 w-full rounded-sm" data-testid="save-product">
              {saving && <Loader2 className="size-4 animate-spin" />} {initial ? "Save changes" : "Create product"}
            </Button>
            {initial && (
              <Button variant="destructive" onClick={remove} disabled={deleting} className="h-10 w-full rounded-sm">
                {deleting && <Loader2 className="size-4 animate-spin" />} Delete / archive
              </Button>
            )}
          </div>
        )}
      </div>
    </fieldset>
  );
}

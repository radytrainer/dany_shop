"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, Minus, PencilLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { apiErrorMessage, Field, inputCls, Toggle } from "./admin-ui";

type Status = "DRAFT" | "ACTIVE" | "ARCHIVED";

type LoadedProduct = {
  id: string;
  name: string;
  status: Status;
  price: string;
  salePrice: string | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  translations: { locale: string; name: string }[];
  variants: {
    id: string;
    sku: string;
    stock: number;
    reserved: number;
    isActive: boolean;
    size: { name: string };
    color: { name: string; hex: string };
  }[];
};

type Form = {
  name: string;
  nameKm: string;
  status: Status;
  price: string;
  salePrice: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  variants: {
    id: string;
    label: string;
    hex: string;
    sku: string;
    reserved: number;
    stock: string;
    isActive: boolean;
  }[];
};

const STATUS: { value: Status; label: string }[] = [
  { value: "ACTIVE", label: "Published" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
];

const money = /^\d{1,9}(\.\d{1,2})?$/;

function toForm(p: LoadedProduct): Form {
  return {
    name: p.name,
    nameKm: p.translations.find((t) => t.locale === "km")?.name ?? "",
    status: p.status,
    price: Number(p.price).toFixed(2),
    salePrice: p.salePrice ? Number(p.salePrice).toFixed(2) : "",
    isFeatured: p.isFeatured,
    isNewArrival: p.isNewArrival,
    isBestSeller: p.isBestSeller,
    variants: p.variants.map((v) => ({
      id: v.id,
      label: `${v.color.name} / ${v.size.name}`,
      hex: v.color.hex,
      sku: v.sku,
      reserved: v.reserved,
      stock: String(v.stock),
      isActive: v.isActive,
    })),
  };
}

/** Validate on the client for instant feedback; the server re-validates everything. */
function validate(f: Form): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.name.trim().length < 2) e.name = "Name is required";
  if (!money.test(f.price.trim()) || Number(f.price) <= 0)
    e.price = "Enter a price, e.g. 15 or 15.50";
  if (f.salePrice.trim()) {
    if (!money.test(f.salePrice.trim())) e.salePrice = "Enter a valid amount";
    else if (Number(f.salePrice) >= Number(f.price))
      e.salePrice = "Must be lower than the price";
  }
  f.variants.forEach((v) => {
    const n = Number(v.stock);
    if (!Number.isInteger(n) || n < 0) e[`v-${v.id}`] = "Whole number";
    else if (n < v.reserved) e[`v-${v.id}`] = `Min ${v.reserved} (reserved)`;
  });
  return e;
}

export function ProductQuickEdit({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const errors = form ? validate(form) : {};
  const valid = Object.keys(errors).length === 0;

  async function openPanel() {
    setOpen(true);
    setForm(null);
    setLoading(true);
    try {
      setForm(
        toForm(await api<LoadedProduct>(`/api/admin/products/${productId}`)),
      );
    } catch (e) {
      toast.error(apiErrorMessage(e));
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));
  const setVariant = (id: string, patch: Partial<Form["variants"][number]>) =>
    setForm((f) =>
      f
        ? {
            ...f,
            variants: f.variants.map((v) =>
              v.id === id ? { ...v, ...patch } : v,
            ),
          }
        : f,
    );
  const bump = (id: string, by: number) =>
    setForm((f) =>
      f
        ? {
            ...f,
            variants: f.variants.map((v) =>
              v.id === id
                ? {
                    ...v,
                    stock: String(
                      Math.max(v.reserved, (Number(v.stock) || 0) + by),
                    ),
                  }
                : v,
            ),
          }
        : f,
    );

  async function save() {
    if (!form || !valid) return;
    setBusy(true);
    try {
      await api(`/api/admin/products/${productId}`, {
        method: "PATCH",
        json: {
          name: form.name,
          nameKm: form.nameKm || null,
          status: form.status,
          price: form.price,
          salePrice: form.salePrice || null,
          isFeatured: form.isFeatured,
          isNewArrival: form.isNewArrival,
          isBestSeller: form.isBestSeller,
          variants: form.variants.map((v) => ({
            id: v.id,
            stock: Number(v.stock),
            isActive: v.isActive,
          })),
        },
      });
      toast.success("Product updated");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const totalStock =
    form?.variants
      .filter((v) => v.isActive)
      .reduce((n, v) => n + (Number(v.stock) || 0), 0) ?? 0;

  return (
    <>
      <Button
        variant="outline"
        className="h-8 rounded-sm text-xs"
        onClick={openPanel}
        aria-label={`Quick edit ${productName}`}
      >
        <PencilLine className="size-3.5" /> Quick edit
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        >
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle className="pr-8">Quick edit</SheetTitle>
            <SheetDescription className="truncate">
              {productName}
            </SheetDescription>
          </SheetHeader>

          {loading || !form ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (
            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <Field label="Name (English)" error={errors.name}>
                  <input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field
                  label="Name (Khmer)"
                  hint="Optional — shown when the shop is in Khmer"
                >
                  <input
                    value={form.nameKm}
                    onChange={(e) => set("nameKm", e.target.value)}
                    className={inputCls}
                    lang="km"
                  />
                </Field>

                <div>
                  <p className="mb-1.5 text-xs font-medium">Status</p>
                  <div
                    className="grid grid-cols-3 gap-1 rounded-sm bg-secondary p-1"
                    role="radiogroup"
                    aria-label="Status"
                  >
                    {STATUS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        role="radio"
                        aria-checked={form.status === s.value}
                        onClick={() => set("status", s.value)}
                        className={cn(
                          "h-9 rounded-sm text-xs font-medium transition-colors",
                          form.status === s.value
                            ? "bg-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Price ($)" error={errors.price}>
                    <input
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)}
                      inputMode="decimal"
                      className={inputCls}
                    />
                  </Field>
                  <Field
                    label="Sale price ($)"
                    error={errors.salePrice}
                    hint={
                      !errors.salePrice ? "Leave empty for no sale" : undefined
                    }
                  >
                    <input
                      value={form.salePrice}
                      onChange={(e) => set("salePrice", e.target.value)}
                      inputMode="decimal"
                      placeholder="—"
                      className={inputCls}
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <Toggle
                    checked={form.isFeatured}
                    onChange={(v) => set("isFeatured", v)}
                    label="Featured"
                  />
                  <Toggle
                    checked={form.isNewArrival}
                    onChange={(v) => set("isNewArrival", v)}
                    label="New arrival"
                  />
                  <Toggle
                    checked={form.isBestSeller}
                    onChange={(v) => set("isBestSeller", v)}
                    label="Best seller"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <p className="text-xs font-medium">Stock by variant</p>
                    <p className="text-xs text-muted-foreground">
                      {totalStock} on hand (shown variants)
                    </p>
                  </div>
                  <ul className="divide-y rounded-sm border">
                    {form.variants.map((v) => {
                      const err = errors[`v-${v.id}`];
                      return (
                        <li
                          key={v.id}
                          className={cn(
                            "flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5",
                            !v.isActive && "bg-secondary/50",
                          )}
                        >
                          <div className="flex min-w-[150px] flex-1 items-center gap-3">
                            <span
                              className="size-4 shrink-0 rounded-full border"
                              style={{ backgroundColor: v.hex }}
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  "truncate text-sm",
                                  !v.isActive &&
                                    "text-muted-foreground line-through",
                                )}
                              >
                                {v.label}
                              </p>
                              <p
                                className={cn(
                                  "text-[11px]",
                                  err
                                    ? "text-destructive"
                                    : "text-muted-foreground",
                                )}
                              >
                                {err ??
                                  (v.reserved > 0
                                    ? `${v.reserved} reserved · ${v.sku}`
                                    : v.sku)}
                              </p>
                            </div>
                          </div>
                          <div className="ml-auto flex items-center gap-3">
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() => bump(v.id, -1)}
                                className="flex size-8 items-center justify-center border hover:bg-secondary"
                                aria-label={`Decrease ${v.label} stock`}
                              >
                                <Minus className="size-3.5" />
                              </button>
                              <input
                                value={v.stock}
                                onChange={(e) =>
                                  setVariant(v.id, {
                                    stock: e.target.value.replace(/[^\d]/g, ""),
                                  })
                                }
                                inputMode="numeric"
                                aria-label={`${v.label} stock`}
                                className={cn(
                                  "h-8 w-14 border-y text-center text-sm tabular-nums outline-none focus:bg-secondary",
                                  err && "text-destructive",
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => bump(v.id, 1)}
                                className="flex size-8 items-center justify-center border hover:bg-secondary"
                                aria-label={`Increase ${v.label} stock`}
                              >
                                <Plus className="size-3.5" />
                              </button>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={v.isActive}
                              aria-label={`Show ${v.label} in shop`}
                              title={
                                v.isActive
                                  ? "Shown in shop"
                                  : "Hidden from shop"
                              }
                              onClick={() =>
                                setVariant(v.id, { isActive: !v.isActive })
                              }
                              className={cn(
                                "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                                v.isActive ? "bg-foreground" : "bg-neutral-300",
                              )}
                            >
                              <span
                                className={cn(
                                  "absolute top-0.5 left-0 size-4 rounded-full bg-white shadow-sm transition-transform",
                                  v.isActive
                                    ? "translate-x-4.5"
                                    : "translate-x-0.5",
                                )}
                              />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Stock changes are recorded in the inventory history. Switch
                    a variant off to hide it from the shop.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t px-5 py-3">
                <Button
                  asChild
                  variant="ghost"
                  className="h-10 rounded-sm text-xs"
                >
                  <Link href={`/admin/products/${productId}`}>
                    <ExternalLink className="size-3.5" /> Full editor
                  </Link>
                </Button>
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-sm"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-10 rounded-sm"
                  disabled={!valid || busy}
                >
                  {busy && <Loader2 className="size-4 animate-spin" />} Save
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

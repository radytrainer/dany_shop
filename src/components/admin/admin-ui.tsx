"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiClientError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { inputCls, textareaCls } from "./admin-styles";

export { inputCls, textareaCls };

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-heading text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("min-w-0 rounded-sm border bg-background p-5", className)}>{children}</section>;
}

export function Field({ label, error, children, hint, className }: { label: string; error?: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="mb-1.5 block text-xs font-medium">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}


export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-foreground" : "bg-neutral-300")}
      >
        <span className={cn("absolute top-0.5 left-0 size-4 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-4.5" : "translate-x-0.5")} />
      </button>
      {label}
    </label>
  );
}

export function apiErrorMessage(err: unknown) {
  if (err instanceof ApiClientError) {
    if (err.fields) return `${err.message}: ${Object.entries(err.fields).map(([k, v]) => `${k} — ${v}`).join("; ")}`;
    return err.message;
  }
  return "Something went wrong";
}

export type UploadedImage = { url: string; storageKey: string | null };

/** Uploads images through /api/admin/uploads (validated server-side) and returns their URLs. */
export function ImageUploadButton({
  onUploaded,
  folder = "products",
  multiple = false,
  label = "Upload image",
  className,
}: {
  onUploaded: (imgs: UploadedImage[]) => void;
  folder?: "products" | "categories" | "banners" | "store";
  multiple?: boolean;
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const out: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);
      try {
        out.push(await api<UploadedImage>("/api/admin/uploads", { method: "POST", body: form }));
      } catch (err) {
        toast.error(`${file.name}: ${apiErrorMessage(err)}`);
      }
    }
    setBusy(false);
    if (ref.current) ref.current.value = "";
    if (out.length) onUploaded(out);
  }
  return (
    <>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple={multiple} className="hidden" onChange={(e) => upload(e.target.files)} />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className={cn("inline-flex h-10 items-center gap-2 rounded-sm border border-dashed px-3 text-sm hover:border-foreground disabled:opacity-60", className)}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        {label}
      </button>
    </>
  );
}

/** Single image field with preview, upload and clear. */
export function ImageField({ label, value, onChange, folder = "banners" }: { label: string; value: string | null; onChange: (url: string | null) => void; folder?: "products" | "categories" | "banners" | "store" }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-sm border bg-secondary">
          {value && <Image src={value} alt="" fill sizes="64px" className="object-cover" />}
        </div>
        <ImageUploadButton folder={folder} onUploaded={(imgs) => onChange(imgs[0].url)} label={value ? "Replace" : "Upload"} />
        {value && (
          <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
            <X className="size-3.5" /> Remove
          </button>
        )}
      </div>
    </div>
  );
}

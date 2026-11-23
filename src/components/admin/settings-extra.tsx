"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/fetcher";
import { apiErrorMessage, Card, Field, Toggle, inputCls } from "./admin-ui";

type Method = {
  id?: string;
  name: string;
  description: string;
  fee: string;
  freeOverAmount: string;
  estimatedDays: string;
  isPickup: boolean;
  isActive: boolean;
  sortOrder: number;
  nameKm: string;
  estimatedDaysKm: string;
};

export function DeliveryMethodsManager({ methods }: { methods: Method[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Method | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!edit) return;
    setBusy(true);
    try {
      const payload = { ...edit, description: edit.description || null, freeOverAmount: edit.freeOverAmount || null, estimatedDays: edit.estimatedDays || null, nameKm: edit.nameKm || null, estimatedDaysKm: edit.estimatedDaysKm || null };
      if (edit.id) await api(`/api/admin/delivery-methods/${edit.id}`, { method: "PUT", json: payload });
      else await api("/api/admin/delivery-methods", { method: "POST", json: payload });
      toast.success("Delivery method saved");
      setEdit(null);
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(m: Method) {
    if (!window.confirm(`Delete "${m.name}"?`)) return;
    try {
      const { result } = await api<{ result: string }>(`/api/admin/delivery-methods/${m.id}`, { method: "DELETE" });
      toast.success(result === "deactivated" ? "Used by orders — deactivated instead" : "Deleted");
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Delivery methods & fees</h2>
        <Button className="h-9 rounded-sm" onClick={() => setEdit({ name: "", description: "", fee: "0", freeOverAmount: "", estimatedDays: "", isPickup: false, isActive: true, sortOrder: methods.length, nameKm: "", estimatedDaysKm: "" })}>
          <Plus className="size-4" /> Add
        </Button>
      </div>
      <ul className="divide-y text-sm">
        {methods.map((m) => (
          <li key={m.id} className={`flex items-center gap-3 py-2.5 ${m.isActive ? "" : "opacity-50"}`}>
            <div className="flex-1">
              <p className="font-medium">{m.name}</p>
              <p className="text-xs text-muted-foreground">
                Fee {m.fee}
                {m.freeOverAmount && ` · free over ${m.freeOverAmount}`}
                {m.estimatedDays && ` · ${m.estimatedDays}`}
                {m.isPickup && " · pickup"}
                {!m.isActive && " · inactive"}
              </p>
            </div>
            <button type="button" onClick={() => setEdit(m)} className="p-1.5 hover:bg-secondary" aria-label={`Edit ${m.name}`}>
              <Pencil className="size-3.5" />
            </button>
            <button type="button" onClick={() => remove(m)} className="p-1.5 text-destructive hover:bg-destructive/10" aria-label={`Delete ${m.name}`}>
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {edit && (
        <Dialog open onOpenChange={(o) => !o && setEdit(null)}>
          <DialogContent className="rounded-sm sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{edit.id ? "Edit delivery method" : "New delivery method"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <Field label="Name">
                <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Name (ខ្មែរ)">
                <input lang="km" value={edit.nameKm} onChange={(e) => setEdit({ ...edit, nameKm: e.target.value })} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fee">
                  <input value={edit.fee} onChange={(e) => setEdit({ ...edit, fee: e.target.value })} inputMode="decimal" className={inputCls} />
                </Field>
                <Field label="Free when order reaches (optional)">
                  <input value={edit.freeOverAmount} onChange={(e) => setEdit({ ...edit, freeOverAmount: e.target.value })} inputMode="decimal" className={inputCls} />
                </Field>
                <Field label="Estimated time">
                  <input value={edit.estimatedDays} onChange={(e) => setEdit({ ...edit, estimatedDays: e.target.value })} placeholder="2–4 days" className={inputCls} />
                </Field>
                <Field label="Estimated time (ខ្មែរ)">
                  <input lang="km" value={edit.estimatedDaysKm} onChange={(e) => setEdit({ ...edit, estimatedDaysKm: e.target.value })} placeholder="២–៤ ថ្ងៃ" className={inputCls} />
                </Field>
                <Field label="Display order">
                  <input type="number" min={0} value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) || 0 })} className={inputCls} />
                </Field>
              </div>
              <div className="flex gap-6">
                <Toggle checked={edit.isPickup} onChange={(v) => setEdit({ ...edit, isPickup: v })} label="Store pickup" />
                <Toggle checked={edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} label="Active" />
              </div>
              <Button onClick={save} disabled={busy || !edit.name} className="h-10 rounded-sm">
                {busy && <Loader2 className="size-4 animate-spin" />} Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

type SizeRow = { id: string; name: string; nameKm: string; sortOrder: number; used: number };
type ColorRow = SizeRow & { hex: string };

export function OptionsManager({ sizes, colors }: { sizes: SizeRow[]; colors: ColorRow[] }) {
  const router = useRouter();
  const [size, setSize] = useState({ name: "", nameKm: "" });
  const [color, setColor] = useState({ name: "", nameKm: "", hex: "#A67C52" });

  async function save(kind: "size" | "color", data: Record<string, unknown>, id?: string, message?: string) {
    try {
      await api("/api/admin/options", { method: "POST", json: { kind, id, data } });
      if (message) toast.success(message);
      router.refresh();
      return true;
    } catch (e) {
      toast.error(apiErrorMessage(e));
      return false;
    }
  }

  async function add(kind: "size" | "color") {
    const ok =
      kind === "size"
        ? await save("size", { name: size.name, nameKm: size.nameKm || null, sortOrder: sizes.length }, undefined, "Size added")
        : await save("color", { name: color.name, nameKm: color.nameKm || null, hex: color.hex, sortOrder: colors.length }, undefined, "Colour added");
    if (ok) {
      setSize({ name: "", nameKm: "" });
      setColor({ name: "", nameKm: "", hex: "#A67C52" });
    }
  }

  async function remove(kind: "size" | "color", id: string) {
    try {
      await api(`/api/admin/options?kind=${kind}&id=${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  /** Save the Khmer name when the field loses focus (only if it changed). */
  const saveKm = (kind: "size" | "color", row: SizeRow | ColorRow) => async (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (value === row.nameKm) return;
    const base = { name: row.name, nameKm: value || null, sortOrder: row.sortOrder };
    await save(kind, kind === "color" ? { ...base, hex: (row as ColorRow).hex } : base, row.id, "Khmer name saved");
  };

  const row = (kind: "size" | "color", r: SizeRow | ColorRow) => (
    <li key={r.id} className="flex items-center gap-2 py-1.5 text-sm">
      {kind === "color" && <span className="size-4 shrink-0 rounded-full border" style={{ backgroundColor: (r as ColorRow).hex }} />}
      <span className="w-24 shrink-0 truncate">{r.name}</span>
      <input
        lang="km"
        defaultValue={r.nameKm}
        onBlur={saveKm(kind, r)}
        placeholder="ខ្មែរ"
        aria-label={`Khmer name for ${r.name}`}
        className="h-8 min-w-0 flex-1 rounded-sm border px-2 text-sm"
      />
      <span className="w-10 shrink-0 text-right text-xs text-muted-foreground" title="Variants using this option">
        {r.used}
      </span>
      {r.used === 0 ? (
        <button type="button" onClick={() => remove(kind, r.id)} aria-label={`Delete ${kind} ${r.name}`} className="p-1">
          <Trash2 className="size-3.5 text-destructive" />
        </button>
      ) : (
        <span className="w-[22px]" />
      )}
    </li>
  );

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold">Sizes & colours</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Add a Khmer name to show translated colour and size names in the store. Options used by products cannot be deleted. The number is how many
        variants use the option.
      </p>
      <p className="mb-1 text-xs font-medium">Sizes</p>
      <ul className="mb-2 divide-y">{sizes.map((s) => row("size", s))}</ul>
      <div className="mb-6 flex gap-2">
        <input value={size.name} onChange={(e) => setSize({ ...size, name: e.target.value })} placeholder="New size, e.g. 38" className={inputCls} />
        <input lang="km" value={size.nameKm} onChange={(e) => setSize({ ...size, nameKm: e.target.value })} placeholder="ខ្មែរ (optional)" className={inputCls} />
        <Button variant="outline" className="h-10 rounded-sm" onClick={() => add("size")} disabled={!size.name.trim()}>
          Add
        </Button>
      </div>
      <p className="mb-1 text-xs font-medium">Colours</p>
      <ul className="mb-2 divide-y">{colors.map((c) => row("color", c))}</ul>
      <div className="flex gap-2">
        <input value={color.name} onChange={(e) => setColor({ ...color, name: e.target.value })} placeholder="Colour name" className={inputCls} />
        <input lang="km" value={color.nameKm} onChange={(e) => setColor({ ...color, nameKm: e.target.value })} placeholder="ខ្មែរ (optional)" className={inputCls} />
        <input type="color" value={color.hex} onChange={(e) => setColor({ ...color, hex: e.target.value.toUpperCase() })} className="h-10 w-12 shrink-0 rounded-sm border" aria-label="Colour" />
        <Button variant="outline" className="h-10 rounded-sm" onClick={() => add("color")} disabled={!color.name.trim()}>
          Add
        </Button>
      </div>
    </Card>
  );
}

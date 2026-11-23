"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Loader2, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextAreaField, TextField } from "@/components/checkout/form-field";
import { useI18n } from "@/i18n/client";
import { errorText } from "@/i18n/errors";
import { api } from "@/lib/fetcher";
import { addressSchema } from "@/lib/validations/auth";

type Address = z.input<typeof addressSchema> & { id: string; isDefault: boolean };

export function AddressBook({ addresses }: { addresses: Address[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState<Address | "new" | null>(null);

  async function remove(id: string) {
    if (!window.confirm(`${t("common.delete")}?`)) return;
    await api(`/api/customers/addresses/${id}`, { method: "DELETE" });
    router.refresh();
  }
  async function makeDefault(a: Address) {
    const { id: _id, ...rest } = a;
    await api(`/api/customers/addresses/${a.id}`, { method: "PUT", json: { ...rest, isDefault: true } });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-[0.16em] uppercase">{t("account.addresses")}</h2>
        <Button variant="outline" className="h-10 rounded-sm text-xs" onClick={() => setEditing("new")}>
          <Plus className="size-4" /> {t("account.addAddress")}
        </Button>
      </div>
      {addresses.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("account.noAddresses")}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="border p-5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="flex items-center gap-2 font-medium">
                  <MapPin className="size-4" aria-hidden /> {a.label || a.fullName}
                </p>
                {a.isDefault && <span className="bg-foreground px-2 py-0.5 text-[10px] text-background uppercase">{t("account.defaultAddress")}</span>}
              </div>
              <p className="mt-2">{a.fullName}</p>
              <p className="text-muted-foreground">{a.phone}</p>
              <p className="text-muted-foreground">{[a.addressLine, a.commune, a.district, a.province].filter(Boolean).join(", ")}</p>
              <div className="mt-4 flex gap-4 text-xs">
                <button type="button" className="underline underline-offset-4" onClick={() => setEditing(a)}>
                  {t("common.edit")}
                </button>
                {!a.isDefault && (
                  <button type="button" className="underline underline-offset-4" onClick={() => makeDefault(a)}>
                    {t("account.makeDefault")}
                  </button>
                )}
                <button type="button" className="text-destructive underline underline-offset-4" onClick={() => remove(a.id)}>
                  {t("common.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <AddressDialog
          address={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AddressDialog({ address, onClose, onSaved }: { address: Address | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const form = useForm<z.input<typeof addressSchema>, unknown, z.output<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: address ?? { label: "", fullName: "", phone: "", province: "", district: "", commune: "", addressLine: "", notes: "" },
  });
  const e = form.formState.errors;
  const submit = form.handleSubmit(async (values) => {
    try {
      if (address) await api(`/api/customers/addresses/${address.id}`, { method: "PUT", json: { ...values, isDefault: address.isDefault } });
      else await api("/api/customers/addresses", { method: "POST", json: values });
      onSaved();
    } catch (err) {
      toast.error(errorText(t, err));
    }
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-sm sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-normal">{address ? t("account.editAddress") : t("account.addAddress")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
          <TextField label={t("account.addressLabel")} optional error={e.label?.message} {...form.register("label")} className="sm:col-span-2" />
          <TextField label={t("checkout.fullName")} error={e.fullName?.message} {...form.register("fullName")} />
          <TextField label={t("checkout.phone")} type="tel" error={e.phone?.message} {...form.register("phone")} />
          <TextField label={t("checkout.address")} error={e.addressLine?.message} {...form.register("addressLine")} className="sm:col-span-2" />
          <TextAreaField label={t("checkout.notes")} optional error={e.notes?.message} {...form.register("notes")} className="sm:col-span-2" />
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="xl" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {t("common.save")}
            </Button>
            <Button type="button" size="xl" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

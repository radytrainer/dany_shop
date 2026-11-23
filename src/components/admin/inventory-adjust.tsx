"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/fetcher";
import { apiErrorMessage, Field, inputCls } from "./admin-ui";

const REASONS = ["Stock received from supplier", "Stock count correction", "Damaged / defective", "Returned by customer", "Lost / missing"];

export function AdjustStockButton({ variantId, label, stock, reserved }: { variantId: string; label: string; stock: number; reserved: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [busy, setBusy] = useState(false);
  const n = Number(delta);
  const valid = Number.isInteger(n) && n !== 0 && stock + n >= reserved && stock + n >= 0 && reason.trim().length >= 3;

  async function submit() {
    setBusy(true);
    try {
      await api("/api/admin/inventory/adjust", { method: "POST", json: { variantId, delta: n, reason } });
      toast.success("Stock adjusted");
      setOpen(false);
      setDelta("");
      router.refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" className="h-8 rounded-sm text-xs" onClick={() => setOpen(true)}>
        Adjust
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
          </DialogHeader>
          <p className="text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">
            On hand {stock} · reserved {reserved} · available {stock - reserved}
          </p>
          <Field label="Change (+ to add, − to remove)" hint={delta && Number.isInteger(n) ? `New on-hand stock: ${stock + n}` : undefined}>
            <input value={delta} onChange={(e) => setDelta(e.target.value)} inputMode="numeric" placeholder="e.g. 10 or -2" className={inputCls} autoFocus />
          </Field>
          <Field label="Reason (required)">
            <input list="adjust-reasons" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />
            <datalist id="adjust-reasons">
              {REASONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Field>
          {delta && stock + n < reserved && <p className="text-xs text-destructive">Stock cannot go below units reserved by open orders.</p>}
          <Button onClick={submit} disabled={!valid || busy} className="h-10 rounded-sm">
            {busy && <Loader2 className="size-4 animate-spin" />} Save adjustment
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

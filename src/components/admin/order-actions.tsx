"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/fetcher";
import { apiErrorMessage, Field, inputCls, textareaCls } from "./admin-ui";

const label = (s: string) => s.charAt(0) + s.slice(1).replace(/_/g, " ").toLowerCase();

export function OrderStatusForm({ orderId, status, allowed, canManage }: { orderId: string; status: string; allowed: string[]; canManage: boolean }) {
  const router = useRouter();
  const forward = allowed.filter((s) => s !== "CANCELLED");
  const [to, setTo] = useState(forward[0] ?? "");
  const [note, setNote] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState<"update" | "cancel" | null>(null);

  if (!canManage) return <p className="text-sm text-muted-foreground">You can view this order but not change it.</p>;
  if (allowed.length === 0) return <p className="text-sm text-muted-foreground">This order is {label(status)} — no further status changes.</p>;

  async function submit(target: string, kind: "update" | "cancel") {
    if (kind === "cancel" && !window.confirm("Cancel this order? Reserved stock will be released (or restocked if already deducted).")) return;
    setBusy(kind);
    try {
      await api(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        json: { status: target, note: note || null, paymentNote: paymentNote || null, trackingNumber: tracking || null },
      });
      toast.success(`Order marked as ${label(target)}`);
      setNote("");
      setPaymentNote("");
      router.refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {forward.length > 0 && (
        <>
          <Field label="Change status to">
            <select value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} data-testid="status-select">
              {forward.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </Field>
          {to === "PAYMENT_RECEIVED" && (
            <Field label="Payment confirmation (recorded manually)" hint="e.g. ABA transfer ref 1234 received 22 Nov">
              <input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className={inputCls} />
            </Field>
          )}
          {to === "SHIPPED" && (
            <Field label="Tracking number">
              <input value={tracking} onChange={(e) => setTracking(e.target.value)} className={inputCls} />
            </Field>
          )}
          <Field label="Note for the timeline (optional)">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={textareaCls} />
          </Field>
          <Button onClick={() => submit(to, "update")} disabled={!to || busy !== null} className="h-10 w-full rounded-sm" data-testid="update-status">
            {busy === "update" && <Loader2 className="size-4 animate-spin" />} Update status
          </Button>
        </>
      )}
      {allowed.includes("CANCELLED") && (
        <Button variant="destructive" onClick={() => submit("CANCELLED", "cancel")} disabled={busy !== null} className="h-10 w-full rounded-sm">
          {busy === "cancel" && <Loader2 className="size-4 animate-spin" />} Cancel order
        </Button>
      )}
    </div>
  );
}

export function OrderNotesForm({ orderId, internalNotes, trackingNumber, canManage }: { orderId: string; internalNotes: string | null; trackingNumber: string | null; canManage: boolean }) {
  const router = useRouter();
  const [notes, setNotes] = useState(internalNotes ?? "");
  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await api(`/api/admin/orders/${orderId}`, { method: "PATCH", json: { internalNotes: notes || null, trackingNumber: tracking || null } });
      toast.success("Saved");
      router.refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <Field label="Tracking number">
        <input value={tracking} onChange={(e) => setTracking(e.target.value)} className={inputCls} disabled={!canManage} />
      </Field>
      <Field label="Internal notes (never shown to the customer)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={textareaCls} disabled={!canManage} />
      </Field>
      {canManage && (
        <Button variant="outline" onClick={save} disabled={busy} className="h-10 rounded-sm">
          {busy && <Loader2 className="size-4 animate-spin" />} Save notes
        </Button>
      )}
    </div>
  );
}

export function CopyMessageButton({ message }: { message: string }) {
  return (
    <Button
      variant="outline"
      className="h-9 rounded-sm text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(message);
        toast.success("Order summary copied");
      }}
    >
      Copy order summary
    </Button>
  );
}

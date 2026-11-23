import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  AWAITING_SELLER_CONFIRMATION: "bg-amber-50 text-amber-800 border-amber-200",
  CONFIRMED: "bg-sky-50 text-sky-800 border-sky-200",
  AWAITING_PAYMENT: "bg-orange-50 text-orange-800 border-orange-200",
  PAYMENT_RECEIVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  PREPARING: "bg-indigo-50 text-indigo-800 border-indigo-200",
  SHIPPED: "bg-violet-50 text-violet-800 border-violet-200",
  COMPLETED: "bg-emerald-100 text-emerald-900 border-emerald-300",
  CANCELLED: "bg-neutral-100 text-neutral-600 border-neutral-300",
};

export function OrderStatusBadge({ status, label, className }: { status: string; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center border px-2.5 py-1 text-xs font-medium", TONES[status] ?? "bg-secondary", className)} data-status={status}>
      {label}
    </span>
  );
}

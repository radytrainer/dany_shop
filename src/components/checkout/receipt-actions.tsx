import { Download, Printer } from "lucide-react";

/**
 * Receipt PDF links. Plain anchors (no client JS): "download" saves the file, the
 * other opens it in the browser's PDF viewer in a new tab, where it can be printed.
 */
export function ReceiptActions({
  orderNumber,
  token,
  locale,
  labels,
}: {
  orderNumber: string;
  token: string | null;
  locale: string;
  labels: { download: string; print: string; hint: string };
}) {
  const base = `/api/orders/${encodeURIComponent(orderNumber)}/receipt`;
  const query = (download: boolean) => {
    const p = new URLSearchParams({ lang: locale });
    if (token) p.set("token", token);
    if (download) p.set("download", "1");
    return `${base}?${p}`;
  };
  const cls =
    "inline-flex h-11 w-full items-center justify-center gap-2 border border-foreground/20 bg-background px-3 sm:flex-1 lg:flex-none text-xs font-medium tracking-wide transition-colors hover:bg-foreground hover:text-background";
  return (
    <div className="space-y-2" data-testid="receipt-actions">
      <p className="text-xs text-muted-foreground">{labels.hint}</p>
      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
        <a href={query(true)} download={`receipt-${orderNumber}.pdf`} className={cls}>
          <Download className="size-4" aria-hidden /> {labels.download}
        </a>
        <a href={query(false)} target="_blank" rel="noopener" className={cls}>
          <Printer className="size-4" aria-hidden /> {labels.print}
        </a>
      </div>
    </div>
  );
}

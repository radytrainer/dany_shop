"use client";

import { Ruler } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/client";
import { useStore } from "@/features/store/store-provider";

/** Renders the admin-managed size guide. Lines with "|" render as a table; others as paragraphs. */
export function SizeGuideDialog() {
  const { t } = useI18n();
  const { sizeGuide } = useStore();
  if (!sizeGuide) return null;
  const lines = sizeGuide.split("\n").map((l) => l.trim()).filter(Boolean);
  const tableRows = lines.filter((l) => l.includes("|")).map((l) => l.split("|").map((c) => c.trim()));
  const notes = lines.filter((l) => !l.includes("|"));
  return (
    <Dialog>
      <DialogTrigger className="inline-flex items-center gap-1.5 text-xs underline underline-offset-4">
        <Ruler className="size-3.5" aria-hidden />
        {t("product.sizeGuide")}
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-normal">{t("product.sizeGuide")}</DialogTitle>
        </DialogHeader>
        {tableRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {tableRows[0].map((c) => (
                    <th key={c} className="px-2 py-2 text-left font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(1).map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {row.map((c, j) => (
                      <td key={j} className="px-2 py-2 tabular-nums">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {notes.map((n, i) => (
          <p key={i} className="text-sm text-muted-foreground">
            {n}
          </p>
        ))}
      </DialogContent>
    </Dialog>
  );
}

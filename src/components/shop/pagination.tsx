import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Translator } from "@/i18n/translator";

/** Server-rendered, crawlable pagination links. */
export function Pagination({
  page,
  pageCount,
  basePath,
  searchParams,
  t,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  t: Translator;
}) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === "page" || v === undefined) continue;
      sp.set(k, Array.isArray(v) ? v.join(",") : v);
    }
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1);

  return (
    <nav className="mt-14 flex items-center justify-center gap-1" aria-label={t("a11y.pagination")}>
      {page > 1 ? (
        <Link href={href(page - 1)} className="flex size-10 items-center justify-center hover:bg-secondary" aria-label={t("common.previous")} rel="prev">
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className="size-10" />
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn("flex size-10 items-center justify-center text-sm", p === page ? "bg-foreground text-background" : "hover:bg-secondary")}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={href(page + 1)} className="flex size-10 items-center justify-center hover:bg-secondary" aria-label={t("common.next")} rel="next">
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className="size-10" />
      )}
    </nav>
  );
}

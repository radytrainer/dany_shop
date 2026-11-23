import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Server-rendered pagination (accepts an href builder, so it must not be a client component). */
export function AdminPagination({ page, pageCount, href }: { page: number; pageCount: number; href: (p: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="inline-flex size-8 items-center justify-center rounded-sm border hover:bg-secondary" aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Link>
      ) : null}
      <span className="text-muted-foreground">
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={href(page + 1)} className="inline-flex size-8 items-center justify-center rounded-sm border hover:bg-secondary" aria-label="Next page">
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

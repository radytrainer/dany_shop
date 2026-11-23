"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { pushRecentSearch } from "@/components/layout/search-overlay";

export function SearchPageForm({ initial }: { initial: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        if (!v) return;
        pushRecentSearch(v);
        router.push(`/search?q=${encodeURIComponent(v)}`);
      }}
      className="flex items-center gap-3 border-b border-foreground pb-2"
    >
      <Search className="size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("search.placeholder")}
        aria-label={t("search.placeholder")}
        maxLength={100}
        className="h-11 flex-1 bg-transparent text-lg outline-none"
      />
    </form>
  );
}

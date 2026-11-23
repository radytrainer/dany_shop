"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** URL-backed listing state. Any filter change resets pagination to page 1. */
export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const getList = useCallback((key: string) => (params.get(key) ?? "").split(",").filter(Boolean), [params]);

  const update = useCallback(
    (changes: Record<string, string | string[] | null>, opts: { keepPage?: boolean } = {}) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        const value = Array.isArray(v) ? v.join(",") : v;
        if (value === null || value === "") next.delete(k);
        else next.set(k, value);
      }
      if (!opts.keepPage) next.delete("page");
      const qs = next.toString();
      startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: !!opts.keepPage }));
    },
    [params, pathname, router],
  );

  const toggleInList = useCallback(
    (key: string, value: string) => {
      const list = getList(key);
      update({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
    },
    [getList, update],
  );

  return { params, getList, update, toggleInList, pending };
}

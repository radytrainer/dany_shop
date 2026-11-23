import { Skeleton } from "@/components/ui/skeleton";

/** Default storefront loading state: listing-shaped skeleton (no layout shift). */
export default function Loading() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-live="polite">
      <Skeleton className="h-10 w-64 rounded-none" />
      <Skeleton className="mt-3 h-4 w-40 rounded-none" />
      <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[3/4] w-full rounded-none" />
            <Skeleton className="mt-3 h-4 w-3/4 rounded-none" />
            <Skeleton className="mt-2 h-4 w-1/3 rounded-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

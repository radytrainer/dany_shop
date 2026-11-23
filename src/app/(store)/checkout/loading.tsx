/**
 * Instant feedback while the checkout page renders (it is dynamic, and on mobile networks far
 * from the server that takes a moment). Safe here: /checkout never returns notFound().
 */
export default function CheckoutLoading() {
  return (
    <div className="container-page max-w-6xl py-8 sm:py-12" aria-busy="true" aria-live="polite">
      <div className="h-9 w-48 animate-pulse bg-secondary" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-40 animate-pulse bg-secondary" />
              <div className="h-12 animate-pulse bg-secondary/70" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-12 animate-pulse bg-secondary/70" />
                <div className="h-12 animate-pulse bg-secondary/70" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-72 animate-pulse bg-secondary" />
      </div>
    </div>
  );
}

"use client";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-12 text-slate-900 dark:text-slate-100">
      {/* DeliveryBar skeleton */}
      <div className="bg-emerald-700 text-white text-xs px-4 py-2">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-pulse" />
            <div className="h-3 w-40 bg-emerald-600 rounded animate-pulse" />
          </div>
          <div className="hidden md:block h-3 w-16 bg-emerald-600 rounded animate-pulse" />
        </div>
      </div>

      {/* Header skeleton */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="hidden sm:block space-y-1.5">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-2.5 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          </div>

          {/* Search bar skeleton */}
          <div className="flex-1 max-w-xl">
            <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          </div>

          {/* Right side skeleton */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:block w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="hidden md:block w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="hidden md:block h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
            <div className="md:hidden w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-4 space-y-6">
        {/* Breadcrumbs skeleton */}
        <nav className="flex items-center gap-1.5">
          <div className="h-3 w-10 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="w-3 h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </nav>

        {/* Product Detail Layout skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* Left: Gallery skeleton */}
          <div className="space-y-3">
            <div className="w-full aspect-square bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            <div className="flex items-center justify-center gap-2">
              <div className="w-6 h-2 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Right: Product Info skeleton */}
          <div className="space-y-5">
            {/* Badges skeleton */}
            <div className="flex flex-wrap gap-2">
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
              <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
            </div>

            {/* Origin skeleton */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>

            {/* Title skeleton */}
            <div className="space-y-2">
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              <div className="h-6 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            </div>

            {/* Pricing skeleton */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-3">
                <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
              </div>
              <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>

            {/* Unit skeleton */}
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />

            {/* Variants skeleton */}
            <div className="space-y-2">
              <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="flex flex-wrap gap-2">
                <div className="h-12 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                <div className="h-12 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                <div className="h-12 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              </div>
            </div>

            {/* Add to Cart skeleton */}
            <div className="pt-2">
              <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>

            {/* Description skeleton */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-5/6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Related Products skeleton */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="flex items-center gap-1">
              <div className="w-7 h-7 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
              <div className="w-7 h-7 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
            </div>
          </div>

          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2"
              >
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                <div className="h-2.5 w-1/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* MobileBottomNav skeleton */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-around py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-5 h-5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="w-8 h-2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* CartFloatingBar skeleton */}
      <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
      </div>
    </div>
  );
}
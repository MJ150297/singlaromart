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
        {/* HeroCarousel skeleton */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg bg-slate-200 dark:bg-slate-800 min-h-[210px] md:min-h-[250px]">
          <div className="absolute inset-0 flex items-center p-6 md:p-10">
            <div className="space-y-3 max-w-md w-full">
              <div className="h-5 w-28 bg-slate-300 dark:bg-slate-700 rounded-full animate-pulse" />
              <div className="h-8 md:h-10 w-3/4 bg-slate-300 dark:bg-slate-700 rounded-lg animate-pulse" />
              <div className="h-3 w-1/2 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* MegaMenu skeleton */}
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-24 shrink-0 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse"
            />
          ))}
        </div>

        {/* SeasonalOffersCarousel skeleton */}
        <div className="space-y-6">
          {/* Offer banner skeleton */}
          <div className="relative w-full aspect-[16/4] md:aspect-[14/3] rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800">
            <div className="absolute inset-0 flex flex-col justify-center px-5 md:px-8 lg:px-12 space-y-2">
              <div className="h-3 w-24 bg-slate-300 dark:bg-slate-700 rounded-full animate-pulse" />
              <div className="h-6 md:h-8 w-2/3 bg-slate-300 dark:bg-slate-700 rounded-lg animate-pulse" />
              <div className="h-3 w-1/3 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          </div>

          {/* Offer carousel product skeletons */}
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
        </div>

        {/* "All Offerings" section header skeleton */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-10 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-8 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Product grid skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col"
              >
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                <div className="mt-2 h-2.5 w-1/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="mt-1.5 h-3 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="mt-1 h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
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
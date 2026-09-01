export function SkeletonOrderCard() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-2.5 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>
      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded mb-3" />
      <div className="flex gap-3 mb-3">
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4"
        >
          <div className="h-2.5 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-5 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfileCard() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
      </div>
    </div>
  );
}
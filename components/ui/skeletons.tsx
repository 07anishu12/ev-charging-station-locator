export function StationCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-xs animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-gray-200 rounded-md w-3/4" />
          <div className="h-4 bg-gray-100 rounded-md w-1/2" />
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </div>
      <div className="h-4 bg-gray-100 rounded-md w-5/6 mb-4" />
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-20 bg-gray-200 rounded-lg" />
        <div className="h-7 w-24 bg-gray-100 rounded-lg" />
        <div className="h-7 w-16 bg-gray-100 rounded-lg" />
      </div>
      <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
        <div className="h-4 w-24 bg-gray-100 rounded-md" />
        <div className="h-9 w-28 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="w-full h-full min-h-[360px] rounded-2xl bg-emerald-50/50 border border-[var(--color-border)] flex flex-col items-center justify-center p-6 text-center animate-pulse">
      <div className="w-12 h-12 rounded-full bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-primary)] mb-3">
        <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
      <div className="h-4 bg-emerald-200/50 rounded-md w-40 mb-2" />
      <div className="h-3 bg-emerald-100 rounded-md w-60" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 space-y-6 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-28 mb-3" />
      <div className="h-8 sm:h-10 bg-gray-200 rounded-md w-2/3" />
      <div className="h-4 bg-gray-100 rounded-md w-1/2" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-100 rounded-2xl" />
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-[var(--color-border)] bg-white flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

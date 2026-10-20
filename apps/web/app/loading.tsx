// Shown while a page's data loads: the outline of a page in soft grey.
export default function Loading() {
  const bar = "animate-pulse rounded-full bg-surface-2";
  return (
    <div className="grid gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="grid gap-3">
        <div className={`${bar} h-4 w-32`} />
        <div className={`${bar} h-10 w-2/3 max-w-xl`} />
        <div className={`${bar} h-4 w-1/2 max-w-md`} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="grid gap-3 rounded-card bg-surface p-5 shadow-card">
            <div className={`${bar} h-3 w-20`} />
            <div className={`${bar} h-7 w-24`} />
          </div>
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-[repeat(auto-fill,minmax(310px,1fr))]">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="grid gap-4 rounded-card bg-surface p-6 shadow-card">
            <div className="h-[84px] animate-pulse rounded-[14px] bg-surface-2" />
            <div className={`${bar} h-5 w-1/2`} />
            <div className={`${bar} h-3 w-3/4`} />
            <div className={`${bar} h-3 w-2/3`} />
          </div>
        ))}
      </div>
    </div>
  );
}

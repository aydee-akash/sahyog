export default function Loading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">लोड हो रहा है… Loading…</span>
      <div className="h-10 w-2/3 animate-pulse rounded-xl bg-line" />
      <div className="h-5 w-1/2 animate-pulse rounded-xl bg-line" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-line/70" />
        ))}
      </div>
    </div>
  );
}

// Skeleton PLP — pokazywany podczas ładowania RSC (np. po zmianie filtra w URL). Lekki placeholder
// siatki kart, żeby uniknąć skoku layoutu.
export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
        <div className="flex flex-wrap gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex w-72 max-w-full flex-col gap-3 rounded-lg border p-4">
              <div className="h-64 animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

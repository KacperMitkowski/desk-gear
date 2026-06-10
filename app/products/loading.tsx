import { Skeleton } from "@/components/ui/skeleton"

export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <div className="flex flex-col gap-4 md:w-60 md:shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-6 sm:grid-cols-2 xl:w-[960px] xl:flex-none xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex w-full flex-col gap-3 rounded-lg border p-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

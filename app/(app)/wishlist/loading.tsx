function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/5 ${className ?? ''}`} />
}

export default function WishlistLoading() {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/6">
          <div className="h-7 w-24 animate-pulse rounded-xl bg-white/5" />
          <div className="h-9 w-28 animate-pulse rounded-xl bg-white/5" />
        </div>
        <div className="flex-1 divide-y divide-white/4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white/10 animate-pulse shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-48 rounded-lg" />
                <Skeleton className="h-3 w-28 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

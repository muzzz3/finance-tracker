function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/5 ${className ?? ''}`} />
}

export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-3 gap-5">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-28" />
        </div>
      </div>
    </div>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/5 ${className ?? ''}`} />
}

export default function BudgetLoading() {
  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-24" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    </div>
  )
}

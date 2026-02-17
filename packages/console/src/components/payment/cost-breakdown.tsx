import { Skeleton } from '@/components/data-terminal'
import type { CostSummary } from 'aleph-sdk'
import { round } from 'aleph-sdk'

export function CostBreakdown({
  costSummary,
  isLoading,
  className,
}: {
  costSummary: CostSummary | undefined
  isLoading: boolean
  className?: string
}) {
  if (isLoading) {
    return (
      <div className={className}>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-4 w-48 mb-1" />
        <Skeleton className="h-4 w-48 mb-1" />
        <Skeleton className="h-5 w-40 mt-2" />
      </div>
    )
  }

  if (!costSummary || costSummary.lines.length === 0) {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground">
          Configure resources to see cost estimate.
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Cost Estimate
      </h4>
      <div className="space-y-1">
        {costSummary.lines.map((line) => (
          <div
            key={line.id}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground">
              {line.name}
              {line.detail && (
                <span className="ml-1 text-xs opacity-60">
                  ({line.detail})
                </span>
              )}
            </span>
            <span className="font-mono">{round(line.cost, 4)} ALEPH</span>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-border pt-2">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>Total</span>
          <span className="font-mono">
            {round(costSummary.cost, 4)} ALEPH
          </span>
        </div>
      </div>
    </div>
  )
}

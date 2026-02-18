'use client'

import { StatCard, Skeleton } from '@/components/data-terminal'
import { useNetworkStats } from '@/hooks/queries/use-network-stats'

export function NetworkStats() {
  const { data, isLoading } = useNetworkStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    )
  }

  const stats: Array<{ label: string; to: number; suffix?: string }> = [
    { label: 'Core Channel Nodes', to: data?.ccnCount ?? 0 },
    { label: 'Compute Nodes', to: data?.crnCount ?? 0 },
    { label: 'Total vCPUs', to: data?.totalCpu ?? 0 },
    {
      label: 'Total Storage',
      to: data?.totalStorageGb
        ? Math.round(data.totalStorageGb / 1024)
        : 0,
      suffix: ' TB',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map(({ label, to, suffix }) => (
        <StatCard
          key={label}
          label={label}
          to={to}
          {...(suffix !== undefined ? { suffix } : {})}
        />
      ))}
    </div>
  )
}

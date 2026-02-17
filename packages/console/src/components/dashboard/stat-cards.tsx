'use client'

import { StatCard, Skeleton } from '@/components/data-terminal'
import { useInstances } from '@/hooks/queries/use-instances'
import { useVolumes } from '@/hooks/queries/use-volumes'
import { usePrograms } from '@/hooks/queries/use-programs'
import { useDomains } from '@/hooks/queries/use-domains'
import { useSSHKeys } from '@/hooks/queries/use-ssh-keys'
import { useWebsites } from '@/hooks/queries/use-websites'

export function DashboardStatCards() {
  const instances = useInstances()
  const volumes = useVolumes()
  const programs = usePrograms()
  const domains = useDomains()
  const sshKeys = useSSHKeys()
  const websites = useWebsites()

  const isLoading =
    instances.isLoading ||
    volumes.isLoading ||
    programs.isLoading ||
    domains.isLoading ||
    sshKeys.isLoading ||
    websites.isLoading

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    )
  }

  const stats = [
    { label: 'Instances', to: instances.data?.length ?? 0 },
    { label: 'Functions', to: programs.data?.length ?? 0 },
    { label: 'Volumes', to: volumes.data?.length ?? 0 },
    { label: 'Domains', to: domains.data?.length ?? 0 },
    { label: 'SSH Keys', to: sshKeys.data?.length ?? 0 },
    { label: 'Websites', to: websites.data?.length ?? 0 },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} to={stat.to} />
      ))}
    </div>
  )
}

'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { TerminalTabs, Skeleton } from '@/components/data-terminal'
import { PageHeader } from '@/components/shell/page-header'
import { DetailHeader } from '@/components/compute/detail/detail-header'
import { OverviewTab } from '@/components/compute/detail/overview-tab'
import { LogsTab } from '@/components/compute/detail/logs-tab'
import { NetworkingTab } from '@/components/compute/detail/networking-tab'
import { SettingsTab } from '@/components/compute/detail/settings-tab'
import { useInstance } from '@/hooks/queries/use-instances'
import { useDeleteInstance } from '@/hooks/mutations/use-delete-resource'

export default function InstanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: instance, isLoading } = useInstance(id)
  const deleteInstance = useDeleteInstance()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton variant="text" />
        <Skeleton variant="card" height="400px" />
      </div>
    )
  }

  if (!instance) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Instance not found.</p>
      </div>
    )
  }

  function handleDelete() {
    deleteInstance.mutate(id, {
      onSuccess: () => router.push('/compute'),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <DetailHeader
        name={instance.name}
        id={instance.id}
        confirmed={instance.confirmed}
        onDelete={handleDelete}
        isDeleting={deleteInstance.isPending}
        actions
      />
      <TerminalTabs
        tabs={[
          {
            label: 'Overview',
            content: <OverviewTab instance={instance} />,
          },
          {
            label: 'Logs',
            content: <LogsTab instanceId={instance.id} />,
          },
          {
            label: 'Networking',
            content: <NetworkingTab instance={instance} />,
          },
          {
            label: 'Settings',
            content: (
              <SettingsTab
                instance={instance}
                onDelete={handleDelete}
                isDeleting={deleteInstance.isPending}
              />
            ),
          },
        ]}
      />
    </div>
  )
}

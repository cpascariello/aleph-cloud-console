'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Badge,
  Button,
  CopyButton,
  GlowLine,
  HudLabel,
  Skeleton,
  StatusDot,
  TerminalCard,
  TerminalTabs,
} from '@/components/data-terminal'
import { DeleteConfirmationModal } from '@/components/resources/delete-confirmation-modal'
import { PageHeader } from '@/components/shell/page-header'
import { OverviewTab } from '@/components/compute/detail/overview-tab'
import { LogsTab } from '@/components/compute/detail/logs-tab'
import { NetworkingTab } from '@/components/compute/detail/networking-tab'
import { PaymentTab } from '@/components/compute/detail/payment-tab'
import { SettingsTab } from '@/components/compute/detail/settings-tab'
import { useInstance } from '@/hooks/queries/use-instances'
import { useDeleteInstance } from '@/hooks/mutations/use-delete-resource'
import { formatDate, truncateHash } from '@/lib/format'
import { deriveInstanceStatus } from '@/lib/instance-status'
import { useExecutableStatus } from '@/hooks/queries/use-executable-status'
import { Play, RotateCcw, Server, Square, Trash2 } from 'lucide-react'

export default function InstanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: instance, isLoading } = useInstance(id)
  const deleteInstance = useDeleteInstance()
  const [showDelete, setShowDelete] = useState(false)
  const {
    data: rawExecStatus,
    isError: execStatusError,
  } = useExecutableStatus(instance)
  const executableStatus = rawExecStatus === undefined
    ? undefined
    : rawExecStatus
  const instanceStatus = instance
    ? deriveInstanceStatus(executableStatus, execStatusError, !!instance.confirmed)
    : undefined

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

  const vcpus = instance.resources?.vcpus ?? 0
  const memory = instance.resources?.memory ?? 0
  const volumes = instance.volumes ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Server size={24} className="text-accent" />
              <h1 className="text-2xl font-heading">
                {instance.name || truncateHash(instance.id)}
              </h1>
              <StatusDot
                variant={instanceStatus?.dotVariant ?? 'neutral'}
              />
              <Badge
                variant={instanceStatus?.dotVariant ?? 'neutral'}
              >
                {instanceStatus?.label ?? '...'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <HudLabel>ID</HudLabel>
                <span className="font-mono">
                  {truncateHash(instance.id)}
                </span>
                <CopyButton text={instance.id} />
              </div>
            </div>
          </div>

          {instanceStatus?.alert && (
            <Alert variant={instanceStatus.alert.variant}>
              {instanceStatus.alert.message}
            </Alert>
          )}

          {/* Tabs */}
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
                label: 'Payment',
                content: <PaymentTab instance={instance} />,
              },
              {
                label: 'Settings',
                content: (
                  <SettingsTab
                    instance={instance}
                    onDelete={() => setShowDelete(true)}
                    isDeleting={deleteInstance.isPending}
                  />
                ),
              },
            ]}
          />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <TerminalCard tag="INFO" label="Summary">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>Status</HudLabel>
                <div className="flex items-center gap-2">
                  <StatusDot
                    variant={instanceStatus?.dotVariant ?? 'neutral'}
                  />
                  <span>
                    {instanceStatus?.label ?? '...'}
                  </span>
                </div>
              </div>
              <GlowLine />
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>CPU</HudLabel>
                <span>{vcpus} vCPU</span>
              </div>
              <GlowLine />
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>RAM</HudLabel>
                <span>{memory} MB</span>
              </div>
              <GlowLine />
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>Storage</HudLabel>
                <span>
                  {instance.size ? `${instance.size} MB` : '—'}
                </span>
              </div>
              <GlowLine />
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>Created</HudLabel>
                <span>{formatDate(instance.date)}</span>
              </div>
            </div>
          </TerminalCard>

          <TerminalCard tag="CMD" label="Actions">
            <div className="flex flex-col gap-2 p-4">
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Play size={14} />}
                className="w-full justify-start"
              >
                Start
              </Button>
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Square size={14} />}
                className="w-full justify-start"
              >
                Stop
              </Button>
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<RotateCcw size={14} />}
                className="w-full justify-start"
              >
                Reboot
              </Button>
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Trash2 size={14} />}
                className="w-full justify-start"
                onClick={() => setShowDelete(true)}
              >
                Delete Instance
              </Button>
            </div>
          </TerminalCard>

          {volumes.length > 0 && (
            <TerminalCard tag="LINKS" label="Related">
              <div className="flex flex-col gap-3 p-4">
                {volumes.map((vol, i) => {
                  const ref =
                    'ref' in vol
                      ? (vol as { ref?: string }).ref
                      : undefined
                  const name =
                    'name' in vol
                      ? (vol as { name?: string }).name
                      : undefined
                  return (
                    <div
                      key={ref ?? i}
                      className="flex items-center gap-3 text-sm"
                    >
                      <StatusDot variant="success" />
                      <Badge variant="info">Volume</Badge>
                      <span className="font-mono text-xs truncate">
                        {name ||
                          (ref
                            ? truncateHash(ref)
                            : `Volume ${i + 1}`)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </TerminalCard>
          )}
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => {
          handleDelete()
          setShowDelete(false)
        }}
        resourceName={instance.name || instance.id}
        resourceType="Instance"
        highRisk
        isDeleting={deleteInstance.isPending}
      />
    </div>
  )
}

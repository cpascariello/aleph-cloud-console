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
  IconButton,
  Skeleton,
  StatusDot,
  TerminalCard,
  TerminalTabs,
} from '@/components/data-terminal'
import { DeleteConfirmationModal } from '@/components/resources/delete-confirmation-modal'
import { useVolume } from '@/hooks/queries/use-volumes'
import { useDeleteVolume } from '@/hooks/mutations/use-delete-resource'
import { formatDate, relativeTime, truncateHash } from '@/lib/format'
import { humanReadableSize } from 'aleph-sdk'
import { HardDrive, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shell/page-header'

export default function VolumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: volume, isLoading } = useVolume(id)
  const deleteVolume = useDeleteVolume()
  const [showDelete, setShowDelete] = useState(false)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton variant="text" />
        <Skeleton variant="card" height="300px" />
      </div>
    )
  }

  if (!volume) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Volume not found.</p>
      </div>
    )
  }

  function handleDelete() {
    deleteVolume.mutate(id, {
      onSuccess: () => router.push('/infrastructure/volumes'),
    })
  }

  const volumeName = 'name' in volume && volume.name
    ? volume.name
    : truncateHash(volume.id)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <HardDrive size={24} className="text-accent" />
            <h1 className="text-2xl font-heading">{volumeName}</h1>
            <StatusDot variant={volume.confirmed ? 'success' : 'warning'} />
            <Badge variant={volume.confirmed ? 'success' : 'warning'}>
              {volume.confirmed ? 'Confirmed' : 'Pending'}
            </Badge>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} />}
            aria-label="Delete"
            onClick={() => setShowDelete(true)}
          />
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <HudLabel>ID</HudLabel>
            <span className="font-mono">{truncateHash(volume.id)}</span>
            <CopyButton text={volume.id} />
          </div>
          <Badge variant="info">{volume.volumeType}</Badge>
        </div>
      </div>

      <TerminalTabs
        tabs={[
          {
            label: 'Overview',
            content: (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TerminalCard tag="INFO" label="Details">
                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-center gap-3 text-sm">
                      <HudLabel>Size</HudLabel>
                      <span>
                        {volume.size
                          ? humanReadableSize(volume.size)
                          : '—'}
                      </span>
                    </div>
                    <GlowLine />
                    <div className="flex items-center gap-3 text-sm">
                      <HudLabel>Created</HudLabel>
                      <span>{formatDate(volume.date)}</span>
                    </div>
                    <GlowLine />
                    <div className="flex items-center gap-3 text-sm">
                      <HudLabel>Uptime</HudLabel>
                      <span>{relativeTime(volume.date)}</span>
                    </div>
                  </div>
                </TerminalCard>
              </div>
            ),
          },
          {
            label: 'Settings',
            content: (
              <div className="flex flex-col gap-4">
                <TerminalCard tag="DANGER" label="Danger Zone">
                  <div className="flex flex-col gap-3 p-4">
                    <Alert variant="error">
                      Deleting this volume is permanent. All data stored
                      on it will be lost.
                    </Alert>
                    <div className="flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        iconLeft={<Trash2 size={14} />}
                        onClick={() => setShowDelete(true)}
                      >
                        Delete Volume
                      </Button>
                    </div>
                  </div>
                </TerminalCard>
              </div>
            ),
          },
        ]}
      />

      <DeleteConfirmationModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => {
          handleDelete()
          setShowDelete(false)
        }}
        resourceName={volumeName}
        resourceType="Volume"
        highRisk
        isDeleting={deleteVolume.isPending}
      />
    </div>
  )
}

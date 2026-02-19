'use client'

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
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
import { useVolume } from '@/hooks/queries/use-volumes'
import { useInstances } from '@/hooks/queries/use-instances'
import { usePrograms } from '@/hooks/queries/use-programs'
import { useWebsites } from '@/hooks/queries/use-websites'
import { useDeleteVolume } from '@/hooks/mutations/use-delete-resource'
import { formatDate, relativeTime, truncateHash } from '@/lib/format'
import { humanReadableSize, programStorageURL } from 'aleph-sdk'
import {
  Download,
  ExternalLink,
  HardDrive,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '@/components/shell/page-header'

type LinkedResource = {
  type: 'Instance' | 'Function' | 'Website'
  id: string
  name: string
  href: string
}

export default function VolumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: volume, isLoading } = useVolume(id)
  const { data: instances = [] } = useInstances()
  const { data: programs = [] } = usePrograms()
  const { data: websites = [] } = useWebsites()
  const deleteVolume = useDeleteVolume()
  const [showDelete, setShowDelete] = useState(false)

  const linkedResources = useMemo(() => {
    const resources: LinkedResource[] = []

    for (const instance of instances) {
      const vols = instance.volumes ?? []
      const isLinked = vols.some(
        (v) => 'ref' in v && v.ref === id,
      )
      if (isLinked) {
        resources.push({
          type: 'Instance',
          id: instance.id,
          name: instance.name || truncateHash(instance.id),
          href: `/compute/${instance.id}`,
        })
      }
    }

    for (const program of programs) {
      const vols = program.volumes ?? []
      const isLinked =
        program.code?.ref === id ||
        program.runtime?.ref === id ||
        vols.some((v) => 'ref' in v && v.ref === id)
      if (isLinked) {
        resources.push({
          type: 'Function',
          id: program.id,
          name: program.name || truncateHash(program.id),
          href: `/compute/${program.id}`,
        })
      }
    }

    for (const website of websites) {
      if (website.volume_id === id) {
        resources.push({
          type: 'Website',
          id: website.id,
          name: website.name || truncateHash(website.id),
          href: `/infrastructure/websites/${website.id}`,
        })
      }
    }

    return resources
  }, [id, instances, programs, websites])

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
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <HardDrive size={24} className="text-accent" />
              <h1 className="text-2xl font-heading">{volumeName}</h1>
              <StatusDot
                variant={volume.confirmed ? 'success' : 'warning'}
              />
              <Badge variant={volume.confirmed ? 'success' : 'warning'}>
                {volume.confirmed ? 'Confirmed' : 'Pending'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <HudLabel>ID</HudLabel>
                <span className="font-mono">
                  {truncateHash(volume.id)}
                </span>
                <CopyButton text={volume.id} />
              </div>
              <Badge variant="info">{volume.volumeType}</Badge>
            </div>
          </div>

          {/* Tabs */}
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
                        <GlowLine />
                        <div className="flex items-center gap-3 text-sm min-w-0">
                          <HudLabel>Explorer</HudLabel>
                          <a
                            href={volume.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-accent hover:underline inline-flex items-center gap-1 min-w-0"
                          >
                            <span className="truncate">{volume.url}</span>
                            <ExternalLink
                              size={12}
                              className="shrink-0"
                            />
                          </a>
                        </div>
                        <GlowLine />
                        <div className="flex items-center gap-3 text-sm">
                          <HudLabel>Download</HudLabel>
                          <a
                            href={`${programStorageURL}${volume.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline"
                          >
                            Raw file
                          </a>
                          <Download
                            size={12}
                            className="shrink-0 text-muted-foreground"
                          />
                        </div>
                      </div>
                    </TerminalCard>
                    <TerminalCard tag="LINKS" label="Linked Resources">
                      <div className="flex flex-col gap-3 p-4">
                        {linkedResources.length === 0 ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <StatusDot variant="neutral" />
                            <span>Not linked to any resource</span>
                          </div>
                        ) : (
                          linkedResources.map((resource) => (
                            <div key={resource.id}>
                              <div className="flex items-center gap-3 text-sm">
                                <StatusDot variant="success" />
                                <Badge variant="info">
                                  {resource.type}
                                </Badge>
                                <Link
                                  href={resource.href}
                                  className="text-accent hover:underline font-mono text-xs truncate"
                                >
                                  {resource.name}
                                </Link>
                              </div>
                            </div>
                          ))
                        )}
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
                          Deleting this volume is permanent and cannot
                          be undone. All data stored in this volume will
                          be lost.
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
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <TerminalCard tag="INFO" label="Summary">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>Status</HudLabel>
                <div className="flex items-center gap-2">
                  <StatusDot
                    variant={
                      volume.confirmed ? 'success' : 'warning'
                    }
                  />
                  <span>
                    {volume.confirmed ? 'Confirmed' : 'Pending'}
                  </span>
                </div>
              </div>
              <GlowLine />
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>Type</HudLabel>
                <span>{volume.volumeType}</span>
              </div>
              <GlowLine />
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

          <TerminalCard tag="CMD" label="Actions">
            <div className="flex flex-col gap-2 p-4">
              <a
                href={volume.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={<ExternalLink size={14} />}
                  className="w-full justify-start"
                >
                  Explorer
                </Button>
              </a>
              <a
                href={`${programStorageURL}${volume.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={<Download size={14} />}
                  className="w-full justify-start"
                >
                  Download
                </Button>
              </a>
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Trash2 size={14} />}
                className="w-full justify-start"
                onClick={() => setShowDelete(true)}
              >
                Delete Volume
              </Button>
            </div>
          </TerminalCard>

          {linkedResources.length > 0 && (
            <TerminalCard tag="LINKS" label="Related">
              <div className="flex flex-col gap-3 p-4">
                {linkedResources.map((resource) => (
                  <Link
                    key={resource.id}
                    href={resource.href}
                    className="flex items-center gap-3 text-sm text-foreground/70 transition-colors hover:text-foreground"
                  >
                    <StatusDot variant="success" />
                    <Badge variant="info">{resource.type}</Badge>
                    <span className="font-mono text-xs truncate">
                      {resource.name}
                    </span>
                  </Link>
                ))}
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
        resourceName={volumeName}
        resourceType="Volume"
        highRisk
        isDeleting={deleteVolume.isPending}
      />
    </div>
  )
}

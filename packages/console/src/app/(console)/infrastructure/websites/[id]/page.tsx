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
import { useWebsite } from '@/hooks/queries/use-websites'
import { useDeleteWebsite } from '@/hooks/mutations/use-delete-resource'
import { formatDate, relativeTime, truncateHash } from '@/lib/format'
import { WebsiteFrameworkId } from 'aleph-sdk'
import { ArrowLeft, FileCode, Trash2 } from 'lucide-react'
import Link from 'next/link'

const FRAMEWORK_LABELS: Record<string, string> = {
  [WebsiteFrameworkId.React]: 'React',
  [WebsiteFrameworkId.Vue]: 'Vue',
  [WebsiteFrameworkId.Nextjs]: 'Next.js',
  [WebsiteFrameworkId.None]: 'Static HTML',
}

export default function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: website, isLoading } = useWebsite(id)
  const deleteWebsite = useDeleteWebsite()
  const [showDelete, setShowDelete] = useState(false)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton variant="text" />
        <Skeleton variant="card" height="300px" />
      </div>
    )
  }

  if (!website) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Website not found.</p>
      </div>
    )
  }

  function handleDelete() {
    deleteWebsite.mutate(id, {
      onSuccess: () => router.push('/infrastructure/websites'),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/infrastructure/websites"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors w-fit"
        >
          <ArrowLeft size={14} />
          Back to Websites
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FileCode size={24} className="text-accent" />
            <h1 className="text-2xl font-heading">
              {website.name || truncateHash(website.id)}
            </h1>
            <StatusDot
              variant={website.confirmed ? 'success' : 'warning'}
            />
            <Badge variant={website.confirmed ? 'success' : 'warning'}>
              {website.confirmed ? 'Live' : 'Pending'}
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
            <span className="font-mono">{truncateHash(website.id)}</span>
            <CopyButton text={website.id} />
          </div>
          {website.framework && (
            <Badge variant="info">
              {FRAMEWORK_LABELS[website.framework] ?? website.framework}
            </Badge>
          )}
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
                      <HudLabel>Framework</HudLabel>
                      <span>
                        {website.framework
                          ? (FRAMEWORK_LABELS[website.framework] ??
                            website.framework)
                          : '—'}
                      </span>
                    </div>
                    <GlowLine />
                    <div className="flex items-center gap-3 text-sm">
                      <HudLabel>Created</HudLabel>
                      <span>{formatDate(website.date)}</span>
                    </div>
                    <GlowLine />
                    <div className="flex items-center gap-3 text-sm">
                      <HudLabel>Age</HudLabel>
                      <span>{relativeTime(website.date)}</span>
                    </div>
                  </div>
                </TerminalCard>
                {website.url && (
                  <TerminalCard tag="ACCESS" label="Endpoint">
                    <div className="flex flex-col gap-2 p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <HudLabel>URL</HudLabel>
                        <a
                          href={website.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline font-mono text-xs"
                        >
                          {website.url}
                        </a>
                      </div>
                    </div>
                  </TerminalCard>
                )}
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
                      Deleting this website will remove it from the
                      Aleph network. It will no longer be accessible.
                    </Alert>
                    <div className="flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        iconLeft={<Trash2 size={14} />}
                        onClick={() => setShowDelete(true)}
                      >
                        Delete Website
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
        resourceName={website.name || website.id}
        resourceType="Website"
        isDeleting={deleteWebsite.isPending}
      />
    </div>
  )
}

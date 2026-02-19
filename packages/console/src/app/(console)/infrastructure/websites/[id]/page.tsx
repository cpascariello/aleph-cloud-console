'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { useWebsite } from '@/hooks/queries/use-websites'
import { useVolume } from '@/hooks/queries/use-volumes'
import { useDeleteWebsite } from '@/hooks/mutations/use-delete-resource'
import { formatDate, truncateHash } from '@/lib/format'
import {
  WebsiteFrameworkId,
  cidV0toV1,
  ipfsGatewayBase,
  humanReadableSize,
} from 'aleph-sdk'
import { ExternalLink, FileCode, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shell/page-header'

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
  const { data: volume, isError: volumeError } = useVolume(
    website?.volume_id ?? '',
  )
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

  const ipfsCid = volume?.item_hash as string | undefined
  let cidV1: string | null = null
  try {
    cidV1 = ipfsCid ? cidV0toV1(ipfsCid) : null
  } catch {
    // item_hash is not a valid CID; skip gateway sections
  }
  const gatewayUrl = cidV1
    ? `https://${cidV1}.${ipfsGatewayBase}`
    : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <FileCode size={24} className="text-accent" />
              <h1 className="text-2xl font-heading">
                {website.name || truncateHash(website.id)}
              </h1>
              <StatusDot
                variant={website.confirmed ? 'success' : 'warning'}
              />
              <Badge
                variant={website.confirmed ? 'success' : 'warning'}
              >
                {website.confirmed ? 'Live' : 'Pending'}
              </Badge>
              {volumeError && (
                <>
                  <StatusDot variant="error" />
                  <Badge variant="error">Volume Missing</Badge>
                </>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <HudLabel>ID</HudLabel>
                <span className="font-mono">
                  {truncateHash(website.id)}
                </span>
                <CopyButton text={website.id} />
              </div>
            </div>
          </div>

          {volumeError && (
            <Alert variant="warning">
              The volume backing this website has been forgotten or
              deleted from the network. The website content is no
              longer available.
            </Alert>
          )}

          {/* Tabs */}
          <TerminalTabs
            tabs={[
              {
                label: 'Overview',
                content: (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Left column: Access cards */}
                    <div className="flex flex-col gap-6">
                      {gatewayUrl && (
                        <TerminalCard
                          tag="ACCESS"
                          label="Default Gateway"
                        >
                          <div className="flex items-center gap-2 p-4 text-sm">
                            <a
                              href={gatewayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent hover:underline font-mono text-xs break-all"
                            >
                              {gatewayUrl}
                            </a>
                            <CopyButton text={gatewayUrl} />
                            <a
                              href={gatewayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open gateway"
                            >
                              <ExternalLink
                                size={14}
                                className="shrink-0 text-muted-foreground hover:text-accent"
                              />
                            </a>
                          </div>
                        </TerminalCard>
                      )}
                      {cidV1 && (
                        <TerminalCard
                          tag="ACCESS"
                          label="Alternative Gateways"
                        >
                          <div className="flex items-center gap-2 p-4 text-sm">
                            <span className="font-mono text-xs text-muted-foreground break-all">
                              {`https://${cidV1}.ipfs.<gateway-hostname>`}
                            </span>
                            <CopyButton
                              text={`https://${cidV1}.ipfs.`}
                            />
                          </div>
                        </TerminalCard>
                      )}
                      {cidV1 && (
                        <TerminalCard
                          tag="ACCESS"
                          label="ENS Gateways"
                        >
                          <div className="flex flex-col gap-3 p-4 text-sm">
                            <p className="text-muted-foreground">
                              Access your ENS and setup the content hash
                              to this current version:
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-accent break-all">
                                ipfs://{cidV1}
                              </span>
                              <CopyButton text={`ipfs://${cidV1}`} />
                            </div>
                            <p className="text-muted-foreground">
                              Then, your website will be accessible via:
                            </p>
                            <span className="font-mono text-xs text-accent">
                              {'https://<your-ens-name>.eth.limo'}
                            </span>
                          </div>
                        </TerminalCard>
                      )}
                    </div>

                    {/* Right column: Version card */}
                    <div className="flex flex-col gap-6">
                      {website.volume_id && (
                        <TerminalCard
                          tag="VERSION"
                          label="Current Version"
                        >
                          <div className="flex flex-col gap-3 p-4">
                            <div className="flex items-center gap-3 text-sm font-medium">
                              Version {website.version}
                            </div>
                            <GlowLine />
                            {volumeError ? (
                              <>
                                <div className="flex items-center gap-3 text-sm">
                                  <HudLabel>Volume ID</HudLabel>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs break-all">
                                      {website.volume_id}
                                    </span>
                                    <CopyButton
                                      text={website.volume_id}
                                    />
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-3 text-sm">
                                  <HudLabel>Volume</HudLabel>
                                  <Link
                                    href={`/infrastructure/volumes/${website.volume_id}`}
                                    className="text-accent hover:underline font-mono text-xs"
                                  >
                                    {truncateHash(website.volume_id)}
                                  </Link>
                                </div>
                                <GlowLine />
                                <div className="flex flex-col gap-1 text-sm">
                                  <HudLabel>Item Hash</HudLabel>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs break-all">
                                      {website.volume_id}
                                    </span>
                                    <CopyButton
                                      text={website.volume_id}
                                    />
                                  </div>
                                </div>
                                {ipfsCid && (
                                  <>
                                    <GlowLine />
                                    <div className="flex flex-col gap-1 text-sm">
                                      <HudLabel>IPFS CID V0</HudLabel>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs break-all">
                                          {ipfsCid}
                                        </span>
                                        <CopyButton text={ipfsCid} />
                                      </div>
                                    </div>
                                  </>
                                )}
                                {cidV1 && (
                                  <>
                                    <GlowLine />
                                    <div className="flex flex-col gap-1 text-sm">
                                      <HudLabel>IPFS CID V1</HudLabel>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs break-all">
                                          {cidV1}
                                        </span>
                                        <CopyButton text={cidV1} />
                                      </div>
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </TerminalCard>
                      )}
                    </div>
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
                          Deleting this website is permanent and cannot
                          be undone.
                        </Alert>
                        <div className="flex justify-end">
                          <Button
                            variant="danger"
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
                      website.confirmed ? 'success' : 'warning'
                    }
                  />
                  <span>
                    {website.confirmed ? 'Live' : 'Pending'}
                  </span>
                </div>
              </div>
              <GlowLine />
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>Framework</HudLabel>
                <span>
                  {FRAMEWORK_LABELS[website.framework] ??
                    website.framework}
                </span>
              </div>
              <GlowLine />
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>Version</HudLabel>
                <span>{website.version}</span>
              </div>
              <GlowLine />
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>Size</HudLabel>
                <span>
                  {volumeError
                    ? 'Unavailable'
                    : volume?.size
                      ? humanReadableSize(volume.size)
                      : '—'}
                </span>
              </div>
              <GlowLine />
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>Created</HudLabel>
                <span>{formatDate(website.created_at)}</span>
              </div>
              <GlowLine />
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>Updated</HudLabel>
                <span>{formatDate(website.updated_at)}</span>
              </div>
            </div>
          </TerminalCard>

          <TerminalCard tag="CMD" label="Actions">
            <div className="flex flex-col gap-2 p-4">
              {gatewayUrl && (
                <a
                  href={gatewayUrl}
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
                    Open Website
                  </Button>
                </a>
              )}
              <Button
                variant="danger"
                size="sm"
                iconLeft={<Trash2 size={14} />}
                className="w-full justify-start"
                onClick={() => setShowDelete(true)}
              >
                Delete Website
              </Button>
            </div>
          </TerminalCard>

          {website.volume_id && (
            <TerminalCard tag="LINKS" label="Related">
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3 text-sm">
                  <StatusDot
                    variant={volumeError ? 'error' : 'success'}
                  />
                  <Badge variant={volumeError ? 'error' : 'info'}>
                    Volume
                  </Badge>
                  {volumeError ? (
                    <span className="font-mono text-xs text-muted-foreground truncate">
                      Missing
                    </span>
                  ) : (
                    <Link
                      href={`/infrastructure/volumes/${website.volume_id}`}
                      className="text-accent hover:underline font-mono text-xs truncate"
                    >
                      {truncateHash(website.volume_id)}
                    </Link>
                  )}
                </div>
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
        resourceName={website.name || website.id}
        resourceType="Website"
        isDeleting={deleteWebsite.isPending}
      />
    </div>
  )
}

'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Badge,
  CopyButton,
  GlowLine,
  HudLabel,
  IconButton,
  Skeleton,
  StatusDot,
  TerminalCard,
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
  const { data: volume } = useVolume(website?.volume_id ?? '')
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

  // The volume entity's item_hash is the IPFS CID (Qm...),
  // distinct from website.volume_id which is the Aleph message hash (hex)
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
      <div className="flex flex-col gap-4">
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
        </div>
      </div>

      {/* Info row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        <div className="flex flex-col gap-1">
          <HudLabel>Framework</HudLabel>
          <span>
            {FRAMEWORK_LABELS[website.framework] ?? website.framework}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <HudLabel>Version</HudLabel>
          <span>{website.version}</span>
        </div>
        <div className="flex flex-col gap-1">
          <HudLabel>Size</HudLabel>
          <span>{volume?.size ? humanReadableSize(volume.size) : '\u2014'}</span>
        </div>
        <div className="flex flex-col gap-1">
          <HudLabel>Created On</HudLabel>
          <span>{formatDate(website.created_at)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <HudLabel>Updated On</HudLabel>
          <span>{formatDate(website.updated_at)}</span>
        </div>
      </div>

      {/* Default Gateway */}
      {gatewayUrl && (
        <TerminalCard tag="ACCESS" label="Default Gateway">
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

      {/* Alternative Gateways */}
      {cidV1 && (
        <TerminalCard tag="ACCESS" label="Alternative Gateways">
          <div className="flex items-center gap-2 p-4 text-sm">
            <span className="font-mono text-xs text-muted-foreground break-all">
              {`https://${cidV1}.ipfs.<gateway-hostname>`}
            </span>
            <CopyButton text={`https://${cidV1}.ipfs.`} />
          </div>
        </TerminalCard>
      )}

      {/* ENS Gateways */}
      {cidV1 && (
        <TerminalCard tag="ACCESS" label="ENS Gateways">
          <div className="flex flex-col gap-3 p-4 text-sm">
            <p className="text-muted-foreground">
              Access your ENS and setup the content hash to this current
              version:
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

      {/* Current Version */}
      {website.volume_id && (
        <TerminalCard tag="VERSION" label="Current Version">
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3 text-sm font-medium">
              Version {website.version}
            </div>
            <GlowLine />
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
                <CopyButton text={website.volume_id} />
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
          </div>
        </TerminalCard>
      )}

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

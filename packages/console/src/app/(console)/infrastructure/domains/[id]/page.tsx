'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Badge,
  Button,
  CodeBlock,
  CopyButton,
  GlowLine,
  HudLabel,
  IconButton,
  Skeleton,
  StatusDot,
  TerminalCard,
  TerminalTabs,
  Text,
} from '@/components/data-terminal'
import { DeleteConfirmationModal } from '@/components/resources/delete-confirmation-modal'
import { useDomain } from '@/hooks/queries/use-domains'
import { useDeleteDomain } from '@/hooks/mutations/use-delete-resource'
import { truncateHash } from '@/lib/format'
import { EntityDomainTypeName } from 'aleph-sdk'
import { ArrowLeft, Globe, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function DomainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: domain, isLoading } = useDomain(id)
  const deleteDomain = useDeleteDomain()
  const [showDelete, setShowDelete] = useState(false)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton variant="text" />
        <Skeleton variant="card" height="300px" />
      </div>
    )
  }

  if (!domain) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Domain not found.</p>
      </div>
    )
  }

  function handleDelete() {
    deleteDomain.mutate(id, {
      onSuccess: () => router.push('/infrastructure/domains'),
    })
  }

  const dnsRecords = `; DNS Configuration for ${domain.name}
; Add these records to your DNS provider:

${domain.name}.    IN    CNAME    ${domain.ref ?? '<resource-hash>'}.aleph.sh.

; Or if using an A record:
${domain.name}.    IN    A        <check-console-for-ip>
`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/infrastructure/domains"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors w-fit"
        >
          <ArrowLeft size={14} />
          Back to Domains
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Globe size={24} className="text-accent" />
            <h1 className="text-2xl font-heading">{domain.name}</h1>
            <StatusDot variant={domain.confirmed ? 'success' : 'warning'} />
            <Badge variant={domain.confirmed ? 'success' : 'warning'}>
              {domain.confirmed ? 'Active' : 'Pending'}
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
            <span className="font-mono">{truncateHash(id)}</span>
            <CopyButton text={id} />
          </div>
          {domain.target && (
            <Badge variant="info">
              {EntityDomainTypeName[domain.target] ?? domain.target}
            </Badge>
          )}
        </div>
      </div>

      <TerminalTabs
        tabs={[
          {
            label: 'Overview',
            content: (
              <div className="flex flex-col gap-4">
                <TerminalCard tag="DNS" label="DNS Configuration">
                  <div className="flex flex-col gap-3 p-4">
                    <Text variant="muted">
                      Add these DNS records to your domain provider to
                      point your domain to Aleph Cloud.
                    </Text>
                    <CodeBlock language="dns" code={dnsRecords} />
                  </div>
                </TerminalCard>
                <TerminalCard tag="TARGET" label="Linked Resource">
                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-center gap-3 text-sm">
                      <HudLabel>Type</HudLabel>
                      <Badge variant="info">
                        {domain.target
                          ? (EntityDomainTypeName[domain.target] ??
                            domain.target)
                          : '—'}
                      </Badge>
                    </div>
                    <GlowLine />
                    <div className="flex items-center gap-3 text-sm">
                      <HudLabel>Reference</HudLabel>
                      <span className="font-mono text-xs">
                        {domain.ref
                          ? truncateHash(domain.ref)
                          : '—'}
                      </span>
                      {domain.ref && <CopyButton text={domain.ref} />}
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
                      Deleting this domain will unlink it from its
                      target resource. The DNS records will no longer
                      resolve.
                    </Alert>
                    <div className="flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        iconLeft={<Trash2 size={14} />}
                        onClick={() => setShowDelete(true)}
                      >
                        Delete Domain
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
        resourceName={domain.name}
        resourceType="Domain"
        isDeleting={deleteDomain.isPending}
      />
    </div>
  )
}

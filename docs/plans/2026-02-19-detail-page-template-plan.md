# Detail Page Template Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor all four resource detail pages (domain, volume, website, instance) to use a unified layout with dashboard-style sidebar, standardized tabs, and consistent header.

**Architecture:** Each detail page gets a `grid-cols-[1fr_320px]` layout. Main content has a consistent header (icon + title + status + ID row) and `TerminalTabs` (Overview + Settings minimum). Sticky right sidebar has Info Summary, Actions, and Related Resources cards.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS 4, data-terminal design system (TerminalCard, TerminalTabs, Badge, Button, Alert, etc.)

**Design doc:** `docs/plans/2026-02-19-detail-page-template-design.md`

---

### Task 1: Domain Detail Page

The simplest detail page. Establishes the structural pattern all other pages follow.

**Files:**
- Modify: `packages/console/src/app/(console)/infrastructure/domains/[id]/page.tsx`

**Step 1: Rewrite domain detail page**

Replace the entire file with the new layout. Key changes from current:
- Remove `IconButton` + `Trash2` from header (delete moves to sidebar + Settings tab)
- Wrap in `grid-cols-[1fr_320px]` layout
- Existing DNS and TARGET cards move into Overview tab
- Add Settings tab with DANGER card
- Add sidebar: Info Summary, Actions (delete), Related (target resource)

```tsx
'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Alert,
  Badge,
  Button,
  CodeBlock,
  CopyButton,
  GlowLine,
  HudLabel,
  Skeleton,
  StatusDot,
  TerminalCard,
  TerminalTabs,
  Text,
} from '@/components/data-terminal'
import { DeleteConfirmationModal } from '@/components/resources/delete-confirmation-modal'
import { useDomain } from '@/hooks/queries/use-domains'
import { useDeleteDomain } from '@/hooks/mutations/use-delete-resource'
import { formatDate, truncateHash } from '@/lib/format'
import { EntityDomainTypeName } from 'aleph-sdk'
import { Globe, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shell/page-header'

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

  const targetLabel = domain.target
    ? (EntityDomainTypeName[domain.target] ?? domain.target)
    : null

  const dnsRecords = `; DNS Configuration for ${domain.name}
; Add these records to your DNS provider:

${domain.name}.    IN    CNAME    ${domain.ref ?? '<resource-hash>'}.aleph.sh.

; Or if using an A record:
${domain.name}.    IN    A        <check-console-for-ip>
`

  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Globe size={24} className="text-accent" />
              <h1 className="text-2xl font-heading">{domain.name}</h1>
              <StatusDot
                variant={domain.confirmed ? 'success' : 'warning'}
              />
              <Badge variant={domain.confirmed ? 'success' : 'warning'}>
                {domain.confirmed ? 'Active' : 'Pending'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <HudLabel>ID</HudLabel>
                <span className="font-mono">{truncateHash(id)}</span>
                <CopyButton text={id} />
              </div>
              {targetLabel && (
                <Badge variant="info">{targetLabel}</Badge>
              )}
            </div>
          </div>

          {/* Tabs */}
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
                            {targetLabel ?? '—'}
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
                          {domain.ref && (
                            <CopyButton text={domain.ref} />
                          )}
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
                          Deleting this domain is permanent and cannot be
                          undone.
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
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <TerminalCard tag="INFO" label="Summary">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>Status</HudLabel>
                <div className="flex items-center gap-2">
                  <StatusDot
                    variant={domain.confirmed ? 'success' : 'warning'}
                  />
                  <span>
                    {domain.confirmed ? 'Active' : 'Pending'}
                  </span>
                </div>
              </div>
              <GlowLine />
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>Target Type</HudLabel>
                <span>{targetLabel ?? '—'}</span>
              </div>
              <GlowLine />
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>Created</HudLabel>
                <span>{formatDate(domain.date)}</span>
              </div>
            </div>
          </TerminalCard>

          <TerminalCard tag="CMD" label="Actions">
            <div className="flex flex-col gap-2 p-4">
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Trash2 size={14} />}
                className="w-full justify-start"
                onClick={() => setShowDelete(true)}
              >
                Delete Domain
              </Button>
            </div>
          </TerminalCard>

          {domain.ref && (
            <TerminalCard tag="LINKS" label="Related">
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3 text-sm">
                  <StatusDot variant="success" />
                  <Badge variant="info">{targetLabel}</Badge>
                  <span className="font-mono text-xs truncate">
                    {truncateHash(domain.ref)}
                  </span>
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
        resourceName={domain.name}
        resourceType="Domain"
        isDeleting={deleteDomain.isPending}
      />
    </div>
  )
}
```

**Step 2: Verify types**

Run: `pnpm typecheck`
Expected: No new errors in the domain detail page.

**Step 3: Visual verification**

Run: `pnpm --filter console dev`
Navigate to a domain detail page. Verify:
- Header shows Globe icon + domain name + status badge
- ID row with truncated hash + copy button + target type badge
- Two tabs: Overview and Settings
- Overview has DNS Configuration and Linked Resource cards
- Settings has Danger Zone card with delete button
- Sidebar has Info Summary, Actions (Delete), and Related cards
- On narrow viewport, sidebar stacks below main content

**Step 4: Commit**

```bash
git add packages/console/src/app/\(console\)/infrastructure/domains/\[id\]/page.tsx
git commit -m "refactor: domain detail page to unified template layout

Add dashboard-style sidebar (info, actions, related), standardized
tabs (Overview + Settings), and consistent header pattern."
```

---

### Task 2: Volume Detail Page

Medium complexity. Has cross-entity linked resources lookup that needs to stay in the Overview tab AND appear as navigation shortcuts in the sidebar.

**Files:**
- Modify: `packages/console/src/app/(console)/infrastructure/volumes/[id]/page.tsx`

**Step 1: Rewrite volume detail page**

Key changes from current:
- Remove `IconButton` + `Trash2` from header
- Wrap in `grid-cols-[1fr_320px]` layout
- Existing DETAILS and LINKS cards move into Overview tab
- Add Settings tab with DANGER card (highRisk)
- Add sidebar: Info Summary, Actions (explorer, download, delete), Related (linked resources)
- Keep the `linkedResources` useMemo logic

```tsx
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
                        <div className="flex items-center gap-3 text-sm">
                          <HudLabel>Explorer</HudLabel>
                          <a
                            href={volume.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-accent hover:underline truncate"
                          >
                            {truncateHash(volume.url, 16)}
                          </a>
                          <ExternalLink
                            size={12}
                            className="shrink-0 text-muted-foreground"
                          />
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
```

**Step 2: Verify types**

Run: `pnpm typecheck`
Expected: No new errors in the volume detail page.

**Step 3: Visual verification**

Run: `pnpm --filter console dev`
Navigate to a volume detail page. Verify:
- Header: HardDrive icon + name + status badge + volume type badge
- Tabs: Overview and Settings
- Overview: two-column grid with Details card (left) and Linked Resources card (right)
- Settings: Danger Zone with highRisk delete
- Sidebar: Info Summary (status, type, size, created, uptime), Actions (Explorer, Download, Delete), Related (linked resources as navigation links)

**Step 4: Commit**

```bash
git add packages/console/src/app/\(console\)/infrastructure/volumes/\[id\]/page.tsx
git commit -m "refactor: volume detail page to unified template layout

Add dashboard-style sidebar (info, actions, related), standardized
tabs (Overview + Settings), and consistent header pattern."
```

---

### Task 3: Website Detail Page

Restructure from flat card grid to tabbed layout. Move info row to sidebar. ACCESS and VERSION cards become Overview tab content.

**Files:**
- Modify: `packages/console/src/app/(console)/infrastructure/websites/[id]/page.tsx`

**Step 1: Rewrite website detail page**

Key changes from current:
- Remove `IconButton` + `Trash2` from header
- Remove info row (framework, version, size, created, updated) — moves to sidebar
- Wrap in `grid-cols-[1fr_320px]` layout
- Existing ACCESS and VERSION cards move into Overview tab (keep two-column grid)
- Add Settings tab with DANGER card
- Add sidebar: Info Summary (framework, version, size, dates), Actions (open gateway, delete), Related (volume)

```tsx
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
                                <Alert variant="warning">
                                  The volume backing this website has
                                  been forgotten or deleted from the
                                  network. The website content is no
                                  longer available.
                                </Alert>
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
                variant="primary"
                size="sm"
                iconLeft={<Trash2 size={14} />}
                className="w-full justify-start"
                onClick={() => setShowDelete(true)}
              >
                Delete Website
              </Button>
            </div>
          </TerminalCard>

          <TerminalCard tag="LINKS" label="Related">
            <div className="flex flex-col gap-3 p-4">
              {website.volume_id && (
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
              )}
            </div>
          </TerminalCard>
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
```

**Step 2: Verify types**

Run: `pnpm typecheck`
Expected: No new errors in the website detail page.

**Step 3: Visual verification**

Run: `pnpm --filter console dev`
Navigate to a website detail page. Verify:
- Header: FileCode icon + name + status badge + optional Volume Missing badge
- ID row with copy button
- Tabs: Overview and Settings
- Overview: two-column grid with ACCESS cards (left) and VERSION card (right)
- Settings: Danger Zone
- Sidebar: Info Summary (status, framework, version, size, created, updated), Actions (Open Website, Delete), Related (volume link or missing indicator)
- Info row is gone (moved to sidebar)

**Step 4: Commit**

```bash
git add packages/console/src/app/\(console\)/infrastructure/websites/\[id\]/page.tsx
git commit -m "refactor: website detail page to unified template layout

Replace info row with sidebar info summary, add tabs (Overview +
Settings), add dashboard-style sidebar with actions and related
resources."
```

---

### Task 4: Instance Detail Page

Most complex. Restructure header (remove DetailHeader component, add inline header), add sidebar, keep all 4 existing tabs.

**Files:**
- Modify: `packages/console/src/app/(console)/compute/[id]/page.tsx`
- Modify: `packages/console/src/components/compute/detail/settings-tab.tsx` (remove duplicate delete modal — sidebar handles it)

**Step 1: Rewrite instance detail page**

Key changes:
- Remove `DetailHeader` import and usage
- Add inline header with Server icon + status + ID row
- Wrap in `grid-cols-[1fr_320px]` layout
- Keep all 4 existing tabs (Overview, Logs, Networking, Settings)
- Add sidebar: Info Summary (status, specs, payment, created), Actions (Start, Stop, Reboot, Delete), Related (volumes, domains)
- Move delete state management to page level (sidebar + settings both trigger same modal)

```tsx
'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
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
import { SettingsTab } from '@/components/compute/detail/settings-tab'
import { useInstance } from '@/hooks/queries/use-instances'
import { useDeleteInstance } from '@/hooks/mutations/use-delete-resource'
import { formatDate, truncateHash } from '@/lib/format'
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

  const vcpus = String(
    (instance as Record<string, unknown>)['vcpus'] ?? '—',
  )
  const memory = String(
    (instance as Record<string, unknown>)['memory'] ?? '—',
  )
  const volumes = (
    (instance as Record<string, unknown>)['volumes'] as
      | Array<{ ref?: string; name?: string }>
      | undefined
  ) ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Server size={24} className="text-accent" />
              <h1 className="text-2xl font-heading">
                {instance.name || truncateHash(instance.id)}
              </h1>
              <StatusDot
                variant={instance.confirmed ? 'success' : 'warning'}
              />
              <Badge
                variant={instance.confirmed ? 'success' : 'warning'}
              >
                {instance.confirmed ? 'Running' : 'Pending'}
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
                    variant={
                      instance.confirmed ? 'success' : 'warning'
                    }
                  />
                  <span>
                    {instance.confirmed ? 'Running' : 'Pending'}
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
                {volumes.map((vol, i) => (
                  <div
                    key={vol.ref ?? i}
                    className="flex items-center gap-3 text-sm"
                  >
                    <StatusDot variant="success" />
                    <Badge variant="info">Volume</Badge>
                    <span className="font-mono text-xs truncate">
                      {vol.name ||
                        (vol.ref
                          ? truncateHash(vol.ref)
                          : `Volume ${i + 1}`)}
                    </span>
                  </div>
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
        resourceName={instance.name || instance.id}
        resourceType="Instance"
        highRisk
        isDeleting={deleteInstance.isPending}
      />
    </div>
  )
}
```

**Step 2: Update SettingsTab to use callback instead of internal modal**

The `SettingsTab` currently manages its own `DeleteConfirmationModal`. Since delete state now lives in the parent page (shared between sidebar and settings tab), change `onDelete` from triggering the mutation to opening the modal.

In `packages/console/src/components/compute/detail/settings-tab.tsx`, remove the internal `showDelete` state and `DeleteConfirmationModal`. The `onDelete` prop now directly opens the parent's modal.

```tsx
'use client'

import {
  Alert,
  Button,
  GlowLine,
  HudLabel,
  TerminalCard,
  Text,
} from '@/components/data-terminal'
import type { Instance } from 'aleph-sdk'
import { Trash2 } from 'lucide-react'

interface SettingsTabProps {
  instance: Instance
  onDelete: () => void
  isDeleting: boolean
}

export function SettingsTab({
  instance,
  onDelete,
  isDeleting,
}: SettingsTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <TerminalCard tag="CONFIG" label="Configuration">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3 text-sm">
            <HudLabel>Name</HudLabel>
            <span className="font-mono">{instance.name || '—'}</span>
          </div>
          <GlowLine />
          <div className="flex items-center gap-3 text-sm">
            <HudLabel>SSH Keys</HudLabel>
            <Text variant="muted">
              Manage SSH keys in Compute &gt; SSH Keys
            </Text>
          </div>
          <GlowLine />
          <div className="flex items-center gap-3 text-sm">
            <HudLabel>Environment Variables</HudLabel>
            <Text variant="muted">
              Not yet configurable from the console.
            </Text>
          </div>
        </div>
      </TerminalCard>

      <TerminalCard tag="DANGER" label="Danger Zone">
        <div className="flex flex-col gap-3 p-4">
          <Alert variant="error">
            Deleting this instance is permanent and cannot be undone.
            All data will be lost.
          </Alert>
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Trash2 size={14} />}
              onClick={onDelete}
              disabled={isDeleting}
            >
              Delete Instance
            </Button>
          </div>
        </div>
      </TerminalCard>
    </div>
  )
}
```

**Step 3: Verify types**

Run: `pnpm typecheck`
Expected: No new errors. The `DetailHeader` import is removed from the page but the component file still exists (cleaned up in Task 5).

**Step 4: Visual verification**

Run: `pnpm --filter console dev`
Navigate to an instance detail page. Verify:
- Header: Server icon + name + status badge
- ID row with copy button
- Tabs: Overview, Logs, Networking, Settings (all 4 preserved)
- Each tab renders its existing content correctly
- Settings tab: delete button opens the same modal as sidebar delete
- Sidebar: Info Summary (status, CPU, RAM, storage, created), Actions (Start, Stop, Reboot, Delete), Related (volumes)
- No trash icon in header row

**Step 5: Commit**

```bash
git add packages/console/src/app/\(console\)/compute/\[id\]/page.tsx packages/console/src/components/compute/detail/settings-tab.tsx
git commit -m "refactor: instance detail page to unified template layout

Replace DetailHeader with inline header, add dashboard-style sidebar
with actions and info summary, lift delete state to page level."
```

---

### Task 5: Clean Up

Remove the now-unused `DetailHeader` component.

**Files:**
- Delete: `packages/console/src/components/compute/detail/detail-header.tsx`

**Step 1: Verify no remaining imports**

Search for any remaining usage of `DetailHeader`:

Run: `rg "DetailHeader" packages/console/src/`
Expected: No results (the only consumer was the instance page, updated in Task 4).

**Step 2: Delete the file**

Run: `trash packages/console/src/components/compute/detail/detail-header.tsx`

**Step 3: Verify types**

Run: `pnpm typecheck`
Expected: No errors (file was unused after Task 4).

**Step 4: Commit**

```bash
git add packages/console/src/components/compute/detail/detail-header.tsx
git commit -m "chore: remove unused DetailHeader component

Replaced by inline header pattern in the unified detail page template."
```

---

### Task 6: Update Documentation

Update ARCHITECTURE.md with the new detail page pattern.

**Files:**
- Modify: `docs/ARCHITECTURE.md` — update the "Resource Detail Page Pattern" section
- Modify: `docs/BACKLOG.md` — move "Two-column card layout for all detail pages" to Completed

**Step 1: Update ARCHITECTURE.md**

Replace the "Resource Detail Page Pattern" section (lines 117-122 approximately) with the updated pattern description reflecting the sidebar layout, standardized tabs, and consistent header.

**Step 2: Update BACKLOG.md**

Move the "Two-column card layout for all detail pages" item from Open to Completed.

**Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md docs/BACKLOG.md
git commit -m "docs: update architecture and backlog for detail page template"
```

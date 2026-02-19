'use client'

import { type ReactNode, Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  DataTable,
  Badge,
  Checkbox,
  Skeleton,
  StatusDot,
  Button,
  IconButton,
} from '@/components/data-terminal'
import { PageHeader } from '@/components/shell/page-header'
import { ResourceFilterBar, type FilterOption } from '@/components/resources/resource-filter-bar'
import { ResourcePagination } from '@/components/resources/resource-pagination'
import { ResourceEmptyState } from '@/components/resources/resource-empty-state'
import { DeleteConfirmationModal } from '@/components/resources/delete-confirmation-modal'
import { WebsiteWizardContent } from '@/components/infrastructure/website-wizard-content'
import { useWebsites } from '@/hooks/queries/use-websites'
import { useVolumes } from '@/hooks/queries/use-volumes'
import { useDeleteWebsite } from '@/hooks/mutations/use-delete-resource'
import { useResourceList } from '@/hooks/use-resource-list'
import { useDrawer } from '@/hooks/use-drawer'
import { truncateHash, relativeTime } from '@/lib/format'
import { WebsiteFrameworkId, WebsiteFrameworks } from 'aleph-sdk'
import type { Website } from 'aleph-sdk'
import { Plus, Settings, Trash2 } from 'lucide-react'

type RowShape = {
  select: ReactNode
  status: ReactNode
  name: ReactNode
  framework: ReactNode
  created_at: ReactNode
  id: ReactNode
  actions: ReactNode
}

const filterOptions: FilterOption[] = [
  { value: WebsiteFrameworkId.Nextjs, label: 'Next.js' },
  { value: WebsiteFrameworkId.React, label: 'React' },
  { value: WebsiteFrameworkId.Vue, label: 'Vue.js' },
  { value: WebsiteFrameworkId.None, label: 'Other' },
]

function WebsiteRowActions({
  website,
  onDelete,
  isDeleting,
}: {
  website: Website
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <>
      <div className="flex items-center gap-1">
        <Link href={`/infrastructure/websites/${website.id}`}>
          <Button variant="ghost" size="sm" iconLeft={<Settings size={14} />}>
            Manage
          </Button>
        </Link>
        <IconButton
          variant="ghost"
          size="sm"
          icon={<Trash2 size={14} />}
          aria-label="Delete"
          onClick={() => setShowDelete(true)}
        />
      </div>
      <DeleteConfirmationModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => {
          onDelete(website.id)
          setShowDelete(false)
        }}
        resourceName={website.name || truncateHash(website.id)}
        resourceType="Website"
        highRisk={false}
        isDeleting={isDeleting}
      />
    </>
  )
}

export default function WebsitesPage() {
  const { data: websites = [], isPending } = useWebsites()
  const { data: volumes = [], isPending: volumesPending } = useVolumes()
  const deleteWebsite = useDeleteWebsite()
  const { openDrawer, closeDrawer } = useDrawer()

  const volumeIds = useMemo(() => {
    const ids = new Set<string>()
    for (const vol of volumes) {
      ids.add(vol.id)
    }
    return ids
  }, [volumes])
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('wizard') === 'website') {
      openDrawer({
        title: 'New Website',
        tag: 'NEW',
        content: (
          <WebsiteWizardContent
            variant="drawer"
            onComplete={closeDrawer}
            onBack={closeDrawer}
          />
        ),
      })
      router.replace('/infrastructure/websites')
    }
  }, [searchParams, openDrawer, closeDrawer, router])

  const list = useResourceList<Website>({
    items: websites,
    getId: (item) => item.id,
    searchFn: (item, query) =>
      (item.name?.toLowerCase().includes(query) ?? false) ||
      item.id.toLowerCase().includes(query),
    filterFn: (item, filter) => item.framework === filter,
    defaultSort: 'created_at',
    sortFn: (a, b, key, dir) => {
      const mult = dir === 'asc' ? 1 : -1
      if (key === 'name') return mult * (a.name ?? '').localeCompare(b.name ?? '')
      if (key === 'created_at') return mult * a.created_at.localeCompare(b.created_at)
      return 0
    },
  })

  const handleDeployWebsite = () => {
    openDrawer({
      title: 'New Website',
      tag: 'NEW',
      content: (
        <WebsiteWizardContent
          variant="drawer"
          onComplete={closeDrawer}
          onBack={closeDrawer}
        />
      ),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <Button
          variant="primary"
          size="sm"
          iconLeft={<Plus size={16} />}
          onClick={handleDeployWebsite}
        >
          Deploy Website
        </Button>
      </PageHeader>

      {isPending ? (
        <Skeleton variant="card" height="300px" />
      ) : list.isEmpty ? (
        <ResourceEmptyState
          resourceName="Website"
          createHref="/infrastructure/websites?wizard=website"
          createLabel="Deploy Website"
        />
      ) : (
        <Suspense>
          <div className="flex flex-col gap-4">
            <ResourceFilterBar
              search={list.search}
              onSearch={list.setSearch}
              filterOptions={filterOptions}
              filterValue={list.filter}
              onFilter={list.setFilter}
              filterPlaceholder="All Frameworks"
            />
            <DataTable
              sortKey={list.sortKey || null}
              sortDir={list.sortDirection}
              onSortChange={list.setSorting}
              columns={[
                { key: 'select', label: '' },
                { key: 'name', label: 'Name', sortable: true },
                { key: 'status', label: 'Status' },
                { key: 'framework', label: 'Framework' },
                { key: 'created_at', label: 'Deployed', sortable: true },
                { key: 'id', label: 'ID' },
                { key: 'actions', label: '' },
              ]}
              rows={list.paginatedItems.map(
                (site): RowShape => ({
                  select: (
                    <Checkbox
                      checked={list.selectedIds.has(site.id)}
                      onChange={() => list.toggleSelection(site.id)}
                    />
                  ),
                  name: (
                    <Link
                      href={`/infrastructure/websites/${site.id}`}
                      className="text-accent hover:underline font-mono text-sm"
                    >
                      {site.name || truncateHash(site.id)}
                    </Link>
                  ),
                  status: (() => {
                    if (volumesPending) {
                      return (
                        <span className="flex items-center gap-2 text-sm">
                          <StatusDot variant="neutral" />
                          <span className="text-muted-foreground">—</span>
                        </span>
                      )
                    }
                    const missing =
                      !!site.volume_id && !volumeIds.has(site.volume_id)
                    return (
                      <span className="flex items-center gap-2 text-sm">
                        <StatusDot
                          variant={missing ? 'error' : 'success'}
                        />
                        <span
                          className={
                            missing
                              ? 'text-red-400'
                              : 'text-muted-foreground'
                          }
                        >
                          {missing ? 'Volume Missing' : 'Live'}
                        </span>
                      </span>
                    )
                  })(),
                  framework: (
                    <Badge variant="neutral">
                      {WebsiteFrameworks[site.framework]?.name ??
                        site.framework}
                    </Badge>
                  ),
                  created_at: (
                    <span className="text-muted-foreground text-sm">
                      {relativeTime(site.created_at)}
                    </span>
                  ),
                  id: (
                    <span className="font-mono text-xs text-muted-foreground">
                      {truncateHash(site.id)}
                    </span>
                  ),
                  actions: (
                    <WebsiteRowActions
                      website={site}
                      onDelete={(id) => deleteWebsite.mutate(id)}
                      isDeleting={deleteWebsite.isPending}
                    />
                  ),
                }),
              )}
            />
            <ResourcePagination
              page={list.page}
              totalPages={list.totalPages}
              onPageChange={list.setPage}
              totalItems={list.filteredItems.length}
            />
          </div>
        </Suspense>
      )}
    </div>
  )
}

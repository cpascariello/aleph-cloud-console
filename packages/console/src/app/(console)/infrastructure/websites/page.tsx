'use client'

import { type ReactNode, Suspense, useState } from 'react'
import Link from 'next/link'
import {
  DataTable,
  Badge,
  Checkbox,
  Skeleton,
  Button,
  IconButton,
} from '@/components/data-terminal'
import { ResourcePageHeader } from '@/components/resources/resource-page-header'
import { ResourceFilterBar, type FilterOption } from '@/components/resources/resource-filter-bar'
import { ResourcePagination } from '@/components/resources/resource-pagination'
import { ResourceEmptyState } from '@/components/resources/resource-empty-state'
import { DeleteConfirmationModal } from '@/components/resources/delete-confirmation-modal'
import { useWebsites } from '@/hooks/queries/use-websites'
import { useDeleteWebsite } from '@/hooks/mutations/use-delete-resource'
import { useResourceList } from '@/hooks/use-resource-list'
import { truncateHash, relativeTime } from '@/lib/format'
import { WebsiteFrameworkId, WebsiteFrameworks } from 'aleph-sdk'
import type { Website } from 'aleph-sdk'
import { Settings, Trash2 } from 'lucide-react'

type RowShape = {
  select: ReactNode
  name: ReactNode
  framework: ReactNode
  date: ReactNode
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
  const { data: websites = [], isLoading } = useWebsites()
  const deleteWebsite = useDeleteWebsite()

  const list = useResourceList<Website>({
    items: websites,
    getId: (item) => item.id,
    searchFn: (item, query) =>
      (item.name?.toLowerCase().includes(query) ?? false) ||
      item.id.toLowerCase().includes(query),
    filterFn: (item, filter) => item.framework === filter,
    defaultSort: 'date',
    sortFn: (a, b, key, dir) => {
      const mult = dir === 'asc' ? 1 : -1
      if (key === 'name') return mult * (a.name ?? '').localeCompare(b.name ?? '')
      if (key === 'date') return mult * a.date.localeCompare(b.date)
      return 0
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <ResourcePageHeader
        title="Websites"
        description="Manage your hosted websites"
        createHref="/infrastructure/websites/new"
        createLabel="Deploy Website"
      />

      {isLoading ? (
        <Skeleton variant="card" height="300px" />
      ) : list.isEmpty ? (
        <ResourceEmptyState
          resourceName="Website"
          createHref="/infrastructure/websites/new"
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
              columns={[
                { key: 'select', label: '' },
                { key: 'name', label: 'Name', sortable: true },
                { key: 'framework', label: 'Framework' },
                { key: 'date', label: 'Deployed', sortable: true },
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
                  framework: (
                    <Badge variant="neutral">
                      {WebsiteFrameworks[site.framework]?.name ??
                        site.framework}
                    </Badge>
                  ),
                  date: (
                    <span className="text-muted-foreground text-sm">
                      {relativeTime(site.date)}
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

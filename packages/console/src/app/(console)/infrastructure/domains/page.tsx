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
import { PageHeader } from '@/components/shell/page-header'
import { ResourceFilterBar } from '@/components/resources/resource-filter-bar'
import { ResourcePagination } from '@/components/resources/resource-pagination'
import { ResourceEmptyState } from '@/components/resources/resource-empty-state'
import { DeleteConfirmationModal } from '@/components/resources/delete-confirmation-modal'
import { useDomains } from '@/hooks/queries/use-domains'
import { useDeleteDomain } from '@/hooks/mutations/use-delete-resource'
import { useResourceList } from '@/hooks/use-resource-list'
import { truncateHash, relativeTime } from '@/lib/format'
import { EntityDomainTypeName } from 'aleph-sdk'
import type { Domain } from 'aleph-sdk'
import { Plus, Settings, Trash2 } from 'lucide-react'

type RowShape = {
  select: ReactNode
  name: ReactNode
  target: ReactNode
  ref: ReactNode
  date: ReactNode
  actions: ReactNode
}

function DomainRowActions({
  domain,
  onDelete,
  isDeleting,
}: {
  domain: Domain
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <>
      <div className="flex items-center gap-1">
        <Link href={`/infrastructure/domains/${domain.id}`}>
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
          onDelete(domain.id)
          setShowDelete(false)
        }}
        resourceName={domain.name}
        resourceType="Domain"
        highRisk={false}
        isDeleting={isDeleting}
      />
    </>
  )
}

export default function DomainsPage() {
  const { data: domains = [], isLoading } = useDomains()
  const deleteDomain = useDeleteDomain()

  const list = useResourceList<Domain>({
    items: domains,
    getId: (item) => item.id,
    searchFn: (item, query) =>
      item.name.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query),
    defaultSort: 'date',
    sortFn: (a, b, key, dir) => {
      const mult = dir === 'asc' ? 1 : -1
      if (key === 'name') return mult * a.name.localeCompare(b.name)
      if (key === 'date') return mult * a.date.localeCompare(b.date)
      return 0
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <Link href="/infrastructure/domains/new">
          <Button variant="primary" size="sm" iconLeft={<Plus size={16} />}>
            Add Domain
          </Button>
        </Link>
      </PageHeader>

      {isLoading ? (
        <Skeleton variant="card" height="300px" />
      ) : list.isEmpty ? (
        <ResourceEmptyState
          resourceName="Domain"
          createHref="/infrastructure/domains/new"
          createLabel="Add Domain"
        />
      ) : (
        <Suspense>
          <div className="flex flex-col gap-4">
            <ResourceFilterBar
              search={list.search}
              onSearch={list.setSearch}
            />
            <DataTable
              columns={[
                { key: 'select', label: '' },
                { key: 'name', label: 'Domain', sortable: true },
                { key: 'target', label: 'Target' },
                { key: 'ref', label: 'Resource' },
                { key: 'date', label: 'Added', sortable: true },
                { key: 'actions', label: '' },
              ]}
              rows={list.paginatedItems.map(
                (domain): RowShape => ({
                  select: (
                    <Checkbox
                      checked={list.selectedIds.has(domain.id)}
                      onChange={() => list.toggleSelection(domain.id)}
                    />
                  ),
                  name: (
                    <Link
                      href={`/infrastructure/domains/${domain.id}`}
                      className="text-accent hover:underline text-sm"
                    >
                      {domain.name}
                    </Link>
                  ),
                  target: (
                    <Badge variant="neutral">
                      {EntityDomainTypeName[domain.target] ?? domain.target}
                    </Badge>
                  ),
                  ref: (
                    <span className="font-mono text-xs text-muted-foreground">
                      {truncateHash(domain.ref)}
                    </span>
                  ),
                  date: (
                    <span className="text-muted-foreground text-sm">
                      {relativeTime(domain.date)}
                    </span>
                  ),
                  actions: (
                    <DomainRowActions
                      domain={domain}
                      onDelete={(id) => deleteDomain.mutate(id)}
                      isDeleting={deleteDomain.isPending}
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

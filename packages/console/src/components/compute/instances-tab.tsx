'use client'

import { type ReactNode, Suspense } from 'react'
import Link from 'next/link'
import {
  DataTable,
  StatusDot,
  Checkbox,
  Skeleton,
} from '@/components/data-terminal'
import { ResourceFilterBar } from '@/components/resources/resource-filter-bar'
import { ResourcePagination } from '@/components/resources/resource-pagination'
import { ResourceEmptyState } from '@/components/resources/resource-empty-state'
import { InstanceRowActions } from '@/components/compute/instance-row-actions'
import { useInstances } from '@/hooks/queries/use-instances'
import { useInstanceStatuses } from '@/hooks/queries/use-instance-statuses'
import { useDeleteInstance } from '@/hooks/mutations/use-delete-resource'
import { useResourceList } from '@/hooks/use-resource-list'
import { truncateHash, relativeTime } from '@/lib/format'
import { deriveInstanceStatus } from '@/lib/instance-status'
import type { Instance } from 'aleph-sdk'

type RowShape = {
  select: ReactNode
  name: ReactNode
  status: ReactNode
  date: ReactNode
  id: ReactNode
  actions: ReactNode
}

export function InstancesTab() {
  const { data: instances = [], isPending } = useInstances()
  const deleteInstance = useDeleteInstance()

  const list = useResourceList<Instance>({
    items: instances,
    getId: (item) => item.id,
    searchFn: (item, query) =>
      (item.name?.toLowerCase().includes(query) ?? false) ||
      item.id.toLowerCase().includes(query),
    defaultSort: 'date',
    sortFn: (a, b, key, dir) => {
      const mult = dir === 'asc' ? 1 : -1
      if (key === 'name') return mult * (a.name ?? '').localeCompare(b.name ?? '')
      if (key === 'date') return mult * (a.date.localeCompare(b.date))
      return 0
    },
  })
  const statusMap = useInstanceStatuses(instances)

  if (isPending) {
    return <Skeleton variant="card" height="300px" />
  }

  if (list.isEmpty) {
    return (
      <ResourceEmptyState
        resourceName="Instance"
        createHref="/compute/new"
        createLabel="Deploy Instance"
      />
    )
  }

  const rows: RowShape[] = list.paginatedItems.map((inst) => ({
    select: (
      <Checkbox
        checked={list.selectedIds.has(inst.id)}
        onChange={() => list.toggleSelection(inst.id)}
      />
    ),
    name: (
      <Link
        href={`/compute/${inst.id}`}
        className="text-accent hover:underline font-mono text-sm"
      >
        {inst.name || truncateHash(inst.id)}
      </Link>
    ),
    status: (() => {
      const entry = statusMap.get(inst.id)
      const derived = deriveInstanceStatus(
        entry?.data,
        entry?.isError ?? false,
        !!inst.confirmed,
      )
      return (
        <span className="flex items-center gap-2">
          <StatusDot variant={derived.dotVariant} />
          <span className="text-sm">{derived.label}</span>
        </span>
      )
    })(),
    date: (
      <span className="text-muted-foreground text-sm">
        {relativeTime(inst.date)}
      </span>
    ),
    id: (
      <span className="font-mono text-xs text-muted-foreground">
        {truncateHash(inst.id)}
      </span>
    ),
    actions: (
      <InstanceRowActions
        id={inst.id}
        name={inst.name || truncateHash(inst.id)}
        onDelete={(id) => deleteInstance.mutate(id)}
        isDeleting={deleteInstance.isPending}
      />
    ),
  }))

  return (
    <Suspense>
      <div className="flex flex-col gap-4">
        <ResourceFilterBar
          search={list.search}
          onSearch={list.setSearch}
        />
        <DataTable
          sortKey={list.sortKey || null}
          sortDir={list.sortDirection}
          onSortChange={list.setSorting}
          columns={[
            { key: 'select', label: '' },
            { key: 'name', label: 'Name', sortable: true },
            { key: 'status', label: 'Status', sortable: true },
            { key: 'date', label: 'Created', sortable: true },
            { key: 'id', label: 'ID' },
            { key: 'actions', label: '' },
          ]}
          rows={rows}
        />
        <ResourcePagination
          page={list.page}
          totalPages={list.totalPages}
          onPageChange={list.setPage}
          totalItems={list.filteredItems.length}
        />
      </div>
    </Suspense>
  )
}

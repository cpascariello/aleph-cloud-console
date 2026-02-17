'use client'

import { type ReactNode, Suspense } from 'react'
import Link from 'next/link'
import {
  DataTable,
  StatusDot,
  Checkbox,
  Skeleton,
  Button,
  IconButton,
} from '@/components/data-terminal'
import { ResourceFilterBar } from '@/components/resources/resource-filter-bar'
import { ResourcePagination } from '@/components/resources/resource-pagination'
import { ResourceEmptyState } from '@/components/resources/resource-empty-state'
import { DeleteConfirmationModal } from '@/components/resources/delete-confirmation-modal'
import { usePrograms } from '@/hooks/queries/use-programs'
import { useDeleteProgram } from '@/hooks/mutations/use-delete-resource'
import { useResourceList } from '@/hooks/use-resource-list'
import { truncateHash, relativeTime } from '@/lib/format'
import type { Program } from 'aleph-sdk'
import { useState } from 'react'
import { Settings, Trash2 } from 'lucide-react'

type RowShape = {
  select: ReactNode
  name: ReactNode
  status: ReactNode
  date: ReactNode
  id: ReactNode
  actions: ReactNode
}

function FunctionRowActions({
  id,
  name,
  onDelete,
  isDeleting,
}: {
  id: string
  name: string
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <>
      <div className="flex items-center gap-1">
        <Link href={`/compute/${id}`}>
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
          onDelete(id)
          setShowDelete(false)
        }}
        resourceName={name}
        resourceType="Function"
        highRisk={false}
        isDeleting={isDeleting}
      />
    </>
  )
}

export function FunctionsTab() {
  const { data: programs = [], isLoading } = usePrograms()
  const deleteProgram = useDeleteProgram()

  const list = useResourceList<Program>({
    items: programs,
    getId: (item) => item.id,
    searchFn: (item, query) =>
      (item.name?.toLowerCase().includes(query) ?? false) ||
      item.id.toLowerCase().includes(query),
    defaultSort: 'date',
    sortFn: (a, b, key, dir) => {
      const mult = dir === 'asc' ? 1 : -1
      if (key === 'name') return mult * (a.name ?? '').localeCompare(b.name ?? '')
      if (key === 'date') return mult * a.date.localeCompare(b.date)
      return 0
    },
  })

  if (isLoading) {
    return <Skeleton variant="card" height="300px" />
  }

  if (list.isEmpty) {
    return (
      <ResourceEmptyState
        resourceName="Function"
        createHref="/compute/new"
        createLabel="Deploy Function"
      />
    )
  }

  const rows: RowShape[] = list.paginatedItems.map((prog) => ({
    select: (
      <Checkbox
        checked={list.selectedIds.has(prog.id)}
        onChange={() => list.toggleSelection(prog.id)}
      />
    ),
    name: (
      <Link
        href={`/compute/${prog.id}`}
        className="text-accent hover:underline font-mono text-sm"
      >
        {prog.name || truncateHash(prog.id)}
      </Link>
    ),
    status: (
      <span className="flex items-center gap-2">
        <StatusDot variant={prog.confirmed ? 'success' : 'warning'} />
        <span className="text-sm">
          {prog.confirmed ? 'Active' : 'Pending'}
        </span>
      </span>
    ),
    date: (
      <span className="text-muted-foreground text-sm">
        {relativeTime(prog.date)}
      </span>
    ),
    id: (
      <span className="font-mono text-xs text-muted-foreground">
        {truncateHash(prog.id)}
      </span>
    ),
    actions: (
      <FunctionRowActions
        id={prog.id}
        name={prog.name || truncateHash(prog.id)}
        onDelete={(id) => deleteProgram.mutate(id)}
        isDeleting={deleteProgram.isPending}
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

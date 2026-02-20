'use client'

import { type ReactNode, Suspense, useState } from 'react'
import {
  DataTable,
  Checkbox,
  Skeleton,
  Button,
  IconButton,
  Text,
} from '@/components/data-terminal'
import { PageHeader } from '@/components/shell/page-header'
import { ResourceFilterBar } from '@/components/resources/resource-filter-bar'
import { ResourcePagination } from '@/components/resources/resource-pagination'
import { ResourceEmptyState } from '@/components/resources/resource-empty-state'
import { DeleteConfirmationModal } from '@/components/resources/delete-confirmation-modal'
import { AddSSHKeyModal } from '@/components/ssh/add-ssh-key-modal'
import { useSSHKeys } from '@/hooks/queries/use-ssh-keys'
import { useDeleteSSHKey } from '@/hooks/mutations/use-delete-resource'
import { useCreateSSHKey } from '@/hooks/mutations/use-create-ssh-key'
import { useResourceList } from '@/hooks/use-resource-list'
import { truncateHash, relativeTime } from '@/lib/format'
import type { SSHKey } from 'aleph-sdk'
import { Trash2, Plus } from 'lucide-react'

type RowShape = {
  select: ReactNode
  label: ReactNode
  key: ReactNode
  date: ReactNode
  actions: ReactNode
}

function truncateKey(key: string): string {
  if (key.length <= 40) return key
  const parts = key.split(' ')
  if (parts.length >= 2) {
    return `${parts[0]} ${truncateHash(parts[1] ?? '', 12)}${parts[2] ? ` ${parts[2]}` : ''}`
  }
  return truncateHash(key, 20)
}

export default function SSHKeysPage() {
  return (
    <Suspense>
      <SSHKeysContent />
    </Suspense>
  )
}

function SSHKeysContent() {
  const { data: sshKeys = [], isPending } = useSSHKeys()
  const deleteSSHKey = useDeleteSSHKey()
  const createSSHKey = useCreateSSHKey()
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SSHKey | null>(null)

  const list = useResourceList<SSHKey>({
    items: sshKeys,
    getId: (item) => item.id,
    searchFn: (item, query) =>
      (item.label?.toLowerCase().includes(query) ?? false) ||
      (item.name?.toLowerCase().includes(query) ?? false) ||
      item.key.toLowerCase().includes(query),
    defaultSort: 'date',
    sortFn: (a, b, key, dir) => {
      const mult = dir === 'asc' ? 1 : -1
      if (key === 'label') return mult * (a.label ?? a.name ?? '').localeCompare(b.label ?? b.name ?? '')
      if (key === 'date') return mult * a.date.localeCompare(b.date)
      return 0
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <Button
          variant="primary"
          size="sm"
          iconLeft={<Plus size={16} />}
          onClick={() => setShowAdd(true)}
        >
          Add Key
        </Button>
      </PageHeader>

      {isPending ? (
        <Skeleton variant="card" height="300px" />
      ) : list.isEmpty ? (
        <ResourceEmptyState
          resourceName="SSH Key"
          createLabel="Add SSH Key"
        />
      ) : (
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
                { key: 'label', label: 'Label', sortable: true },
                { key: 'key', label: 'Key' },
                { key: 'date', label: 'Added', sortable: true },
                { key: 'actions', label: '' },
              ]}
              rows={list.paginatedItems.map(
                (sshKey): RowShape => ({
                  select: (
                    <Checkbox
                      checked={list.selectedIds.has(sshKey.id)}
                      onChange={() => list.toggleSelection(sshKey.id)}
                    />
                  ),
                  label: (
                    <Text variant="body" as="span" className="text-sm">
                      {sshKey.label || sshKey.name || truncateHash(sshKey.id)}
                    </Text>
                  ),
                  key: (
                    <span className="font-mono text-xs text-muted-foreground">
                      {truncateKey(sshKey.key)}
                    </span>
                  ),
                  date: (
                    <span className="text-muted-foreground text-sm">
                      {relativeTime(sshKey.date)}
                    </span>
                  ),
                  actions: (
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      aria-label="Delete"
                      onClick={() => setDeleteTarget(sshKey)}
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

      <AddSSHKeyModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={(key, label) => {
          createSSHKey.mutate(
            { key, label },
            { onSuccess: () => setShowAdd(false) },
          )
        }}
        isSubmitting={createSSHKey.isPending}
      />

      {deleteTarget && (
        <DeleteConfirmationModal
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteSSHKey.mutate(deleteTarget.id)
            setDeleteTarget(null)
          }}
          resourceName={
            deleteTarget.label || deleteTarget.name || truncateHash(deleteTarget.id)
          }
          resourceType="SSH Key"
          highRisk={false}
          isDeleting={deleteSSHKey.isPending}
        />
      )}
    </div>
  )
}

'use client'

import { type ReactNode, Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  DataTable,
  Badge,
  Checkbox,
  Skeleton,
  Button,
  IconButton,
  StatusDot,
} from '@/components/data-terminal'
import { PageHeader } from '@/components/shell/page-header'
import { ResourceFilterBar, type FilterOption } from '@/components/resources/resource-filter-bar'
import { ResourcePagination } from '@/components/resources/resource-pagination'
import { ResourceEmptyState } from '@/components/resources/resource-empty-state'
import { DeleteConfirmationModal } from '@/components/resources/delete-confirmation-modal'
import { VolumeWizardContent } from '@/components/infrastructure/volume-wizard-content'
import { useVolumes } from '@/hooks/queries/use-volumes'
import { useInstances } from '@/hooks/queries/use-instances'
import { usePrograms } from '@/hooks/queries/use-programs'
import { useWebsites } from '@/hooks/queries/use-websites'
import { useDeleteVolume } from '@/hooks/mutations/use-delete-resource'
import { useResourceList } from '@/hooks/use-resource-list'
import { useDrawer } from '@/hooks/use-drawer'
import { truncateHash, relativeTime } from '@/lib/format'
import { humanReadableSize, VolumeType } from 'aleph-sdk'
import type { Volume } from 'aleph-sdk'
import { Plus, Settings, Trash2 } from 'lucide-react'

type RowShape = {
  select: ReactNode
  name: ReactNode
  volumeType: ReactNode
  linked: ReactNode
  size: ReactNode
  date: ReactNode
  id: ReactNode
  actions: ReactNode
}

const volumeTypeLabels: Record<string, string> = {
  [VolumeType.New]: 'New',
  [VolumeType.Existing]: 'Existing',
  [VolumeType.Persistent]: 'Persistent',
}

const filterOptions: FilterOption[] = [
  { value: VolumeType.New, label: 'New' },
  { value: VolumeType.Existing, label: 'Existing' },
  { value: VolumeType.Persistent, label: 'Persistent' },
]

function VolumeRowActions({
  volume,
  onDelete,
  isDeleting,
}: {
  volume: Volume
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const [showDelete, setShowDelete] = useState(false)
  const name =
    ('name' in volume ? volume.name : null) ?? truncateHash(volume.id)

  return (
    <>
      <div className="flex items-center gap-1">
        <Link href={`/infrastructure/volumes/${volume.id}`}>
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
          onDelete(volume.id)
          setShowDelete(false)
        }}
        resourceName={name}
        resourceType="Volume"
        highRisk
        isDeleting={isDeleting}
      />
    </>
  )
}

export default function VolumesPage() {
  const { data: volumes = [], isLoading } = useVolumes()
  const { data: instances = [] } = useInstances()
  const { data: programs = [] } = usePrograms()
  const { data: websites = [] } = useWebsites()
  const deleteVolume = useDeleteVolume()
  const { openDrawer, closeDrawer } = useDrawer()

  const linkedVolumeIds = useMemo(() => {
    const ids = new Set<string>()

    for (const resource of [...instances, ...programs]) {
      for (const vol of resource.volumes ?? []) {
        if ('ref' in vol && typeof vol.ref === 'string') {
          ids.add(vol.ref)
        }
      }
    }

    for (const program of programs) {
      if (program.code?.ref) ids.add(program.code.ref)
      if (program.runtime?.ref) ids.add(program.runtime.ref)
    }

    for (const website of websites) {
      if (website.volume_id) ids.add(website.volume_id)
    }

    return ids
  }, [instances, programs, websites])
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('wizard') === 'volume') {
      openDrawer({
        title: 'New Volume',
        tag: 'NEW',
        content: (
          <VolumeWizardContent
            variant="drawer"
            onComplete={closeDrawer}
            onBack={closeDrawer}
          />
        ),
      })
      router.replace('/infrastructure/volumes')
    }
  }, [searchParams, openDrawer, closeDrawer, router])

  const list = useResourceList<Volume>({
    items: volumes,
    getId: (item) => item.id,
    searchFn: (item, query) =>
      item.id.toLowerCase().includes(query) ||
      ('name' in item && typeof item.name === 'string'
        ? item.name.toLowerCase().includes(query)
        : false),
    filterFn: (item, filter) => item.volumeType === filter,
    defaultSort: 'date',
    defaultDirection: 'desc',
    sortFn: (a, b, key, dir) => {
      const mult = dir === 'asc' ? 1 : -1
      if (key === 'date') return mult * a.date.localeCompare(b.date)
      if (key === 'size') return mult * ((a.size ?? 0) - (b.size ?? 0))
      if (key === 'linked') {
        const aLinked = linkedVolumeIds.has(a.id) ? 1 : 0
        const bLinked = linkedVolumeIds.has(b.id) ? 1 : 0
        return mult * (aLinked - bLinked)
      }
      return 0
    },
  })

  const handleCreateVolume = () => {
    openDrawer({
      title: 'New Volume',
      tag: 'NEW',
      content: (
        <VolumeWizardContent
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
          onClick={handleCreateVolume}
        >
          Create Volume
        </Button>
      </PageHeader>

      {isLoading ? (
        <Skeleton variant="card" height="300px" />
      ) : list.isEmpty ? (
        <ResourceEmptyState
          resourceName="Volume"
          createHref="/infrastructure/volumes?wizard=volume"
          createLabel="Create Volume"
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
              filterPlaceholder="All Types"
            />
            <DataTable
              columns={[
                { key: 'select', label: '' },
                { key: 'name', label: 'Name', sortable: true },
                { key: 'volumeType', label: 'Type' },
                { key: 'linked', label: 'Linked', sortable: true },
                { key: 'size', label: 'Size', sortable: true },
                { key: 'date', label: 'Created', sortable: true },
                { key: 'id', label: 'ID' },
                { key: 'actions', label: '' },
              ]}
              rows={list.paginatedItems.map(
                (vol): RowShape => ({
                  select: (
                    <Checkbox
                      checked={list.selectedIds.has(vol.id)}
                      onChange={() => list.toggleSelection(vol.id)}
                    />
                  ),
                  name: (
                    <Link
                      href={`/infrastructure/volumes/${vol.id}`}
                      className="text-accent hover:underline font-mono text-sm"
                    >
                      {'name' in vol
                        ? vol.name || truncateHash(vol.id)
                        : truncateHash(vol.id)}
                    </Link>
                  ),
                  volumeType: (
                    <Badge variant="neutral">
                      {volumeTypeLabels[vol.volumeType] ?? vol.volumeType}
                    </Badge>
                  ),
                  linked: (
                    <div className="flex items-center gap-2">
                      <StatusDot
                        variant={
                          linkedVolumeIds.has(vol.id)
                            ? 'success'
                            : 'neutral'
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {linkedVolumeIds.has(vol.id) ? 'Yes' : 'No'}
                      </span>
                    </div>
                  ),
                  size: (
                    <span className="text-sm font-mono">
                      {humanReadableSize(vol.size, 'MiB')}
                    </span>
                  ),
                  date: (
                    <span className="text-muted-foreground text-sm">
                      {relativeTime(vol.date)}
                    </span>
                  ),
                  id: (
                    <span className="font-mono text-xs text-muted-foreground">
                      {truncateHash(vol.id)}
                    </span>
                  ),
                  actions: (
                    <VolumeRowActions
                      volume={vol}
                      onDelete={(id) => deleteVolume.mutate(id)}
                      isDeleting={deleteVolume.isPending}
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

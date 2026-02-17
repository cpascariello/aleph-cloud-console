'use client'

import { SearchInput, Select } from '@/components/data-terminal'

export interface FilterOption {
  value: string
  label: string
}

interface ResourceFilterBarProps {
  search: string
  onSearch: (value: string) => void
  filterOptions?: FilterOption[]
  filterValue?: string
  onFilter?: (value: string) => void
  filterPlaceholder?: string
}

export function ResourceFilterBar({
  search,
  onSearch,
  filterOptions,
  filterValue,
  onFilter,
  filterPlaceholder = 'All',
}: ResourceFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex-1">
        <SearchInput
          placeholder="Search..."
          value={search}
          onSearch={onSearch}
          debounceMs={300}
        />
      </div>
      {filterOptions && onFilter && (
        <Select
          options={[{ value: '', label: filterPlaceholder }, ...filterOptions]}
          value={filterValue ?? ''}
          onChange={onFilter}
          className="w-48"
        />
      )}
    </div>
  )
}

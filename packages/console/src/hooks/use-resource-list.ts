'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

const PAGE_SIZE = 25

export interface ResourceListState<T> {
  search: string
  setSearch: (value: string) => void
  filter: string
  setFilter: (value: string) => void
  sortKey: string
  sortDirection: 'asc' | 'desc'
  setSorting: (key: string) => void
  page: number
  setPage: (page: number) => void
  totalPages: number
  selectedIds: Set<string>
  toggleSelection: (id: string) => void
  toggleAll: () => void
  clearSelection: () => void
  paginatedItems: T[]
  filteredItems: T[]
  isEmpty: boolean
  isFiltered: boolean
}

export interface UseResourceListOptions<T> {
  items: T[]
  getId: (item: T) => string
  searchFn: (item: T, query: string) => boolean
  filterFn?: (item: T, filter: string) => boolean
  sortFn?: (a: T, b: T, key: string, dir: 'asc' | 'desc') => number
  defaultSort?: string
}

export function useResourceList<T>(
  options: UseResourceListOptions<T>,
): ResourceListState<T> {
  const { items, getId, searchFn, filterFn, sortFn, defaultSort = '' } = options
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const search = searchParams.get('q') ?? ''
  const filter = searchParams.get('filter') ?? ''
  const sortKey = searchParams.get('sort') ?? defaultSort
  const sortDirection =
    (searchParams.get('dir') as 'asc' | 'desc') ?? 'asc'
  const page = Number(searchParams.get('page') ?? '1')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      if (key !== 'page') {
        params.delete('page')
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const setSearch = useCallback(
    (value: string) => updateParam('q', value),
    [updateParam],
  )

  const setFilter = useCallback(
    (value: string) => updateParam('filter', value),
    [updateParam],
  )

  const setSorting = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (sortKey === key) {
        const nextDir = sortDirection === 'asc' ? 'desc' : 'asc'
        params.set('dir', nextDir)
      } else {
        params.set('sort', key)
        params.set('dir', 'asc')
      }
      params.delete('page')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams, sortKey, sortDirection],
  )

  const setPage = useCallback(
    (p: number) => updateParam('page', p > 1 ? String(p) : ''),
    [updateParam],
  )

  const filteredItems = useMemo(() => {
    let result = items

    if (search) {
      const lower = search.toLowerCase()
      result = result.filter((item) => searchFn(item, lower))
    }

    if (filter && filterFn) {
      result = result.filter((item) => filterFn(item, filter))
    }

    if (sortKey && sortFn) {
      result = [...result].sort((a, b) =>
        sortFn(a, b, sortKey, sortDirection),
      )
    }

    return result
  }, [items, search, searchFn, filter, filterFn, sortKey, sortFn, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredItems.slice(start, start + PAGE_SIZE)
  }, [filteredItems, page])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const pageIds = paginatedItems.map(getId)
      const allSelected = pageIds.every((id) => prev.has(id))
      if (allSelected) {
        const next = new Set(prev)
        for (const id of pageIds) {
          next.delete(id)
        }
        return next
      }
      return new Set([...prev, ...pageIds])
    })
  }, [paginatedItems, getId])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  return {
    search,
    setSearch,
    filter,
    setFilter,
    sortKey,
    sortDirection,
    setSorting,
    page,
    setPage,
    totalPages,
    selectedIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    paginatedItems,
    filteredItems,
    isEmpty: items.length === 0,
    isFiltered: Boolean(search || filter),
  }
}

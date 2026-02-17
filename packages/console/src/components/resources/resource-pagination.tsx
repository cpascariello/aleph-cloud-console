'use client'

import { Button, Text } from '@/components/data-terminal'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ResourcePaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
}

export function ResourcePagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
}: ResourcePaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between pt-4">
      <Text variant="small" as="span">
        {totalItems} item{totalItems !== 1 ? 's' : ''}
      </Text>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          iconLeft={<ChevronLeft size={14} />}
        >
          Prev
        </Button>
        <Text variant="small" as="span" className="px-2">
          {page} / {totalPages}
        </Text>
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          iconRight={<ChevronRight size={14} />}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

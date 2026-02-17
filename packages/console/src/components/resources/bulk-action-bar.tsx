'use client'

import { Button, Text } from '@/components/data-terminal'
import { Trash2, Play, Square } from 'lucide-react'

interface BulkAction {
  label: string
  icon: React.ReactNode
  variant: 'primary' | 'secondary' | 'danger'
  onClick: () => void
}

interface BulkActionBarProps {
  selectedCount: number
  onClear: () => void
  actions: BulkAction[]
}

export function BulkActionBar({
  selectedCount,
  onClear,
  actions,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm p-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <Text variant="small" as="span">
            {selectedCount} selected
          </Text>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              size="sm"
              iconLeft={action.icon}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

export { Trash2, Play, Square }

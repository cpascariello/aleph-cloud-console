import Link from 'next/link'
import { Heading, Text, Button } from '@/components/data-terminal'
import { Plus } from 'lucide-react'

interface ResourcePageHeaderProps {
  title: string
  description?: string
  createHref?: string
  createLabel?: string
}

export function ResourcePageHeader({
  title,
  description,
  createHref,
  createLabel = 'Create',
}: ResourcePageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Heading level={1}>{title}</Heading>
        {description && <Text variant="muted">{description}</Text>}
      </div>
      {createHref && (
        <Link href={createHref}>
          <Button variant="primary" size="sm" iconLeft={<Plus size={16} />}>
            {createLabel}
          </Button>
        </Link>
      )}
    </div>
  )
}

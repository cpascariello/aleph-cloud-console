import Link from 'next/link'
import {
  TerminalCard,
  TypewriterText,
  Button,
  Text,
} from '@/components/data-terminal'
import { Plus } from 'lucide-react'

interface ResourceEmptyStateProps {
  resourceName: string
  createHref?: string
  createLabel?: string
  isFiltered?: boolean
}

export function ResourceEmptyState({
  resourceName,
  createHref,
  createLabel = `Create ${resourceName}`,
  isFiltered = false,
}: ResourceEmptyStateProps) {
  if (isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Text variant="muted">No {resourceName.toLowerCase()}s match your filters.</Text>
      </div>
    )
  }

  return (
    <TerminalCard tag="EMPTY" label={resourceName}>
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <TypewriterText speed={30} className="text-muted-foreground">
          {`No ${resourceName.toLowerCase()}s yet. Deploy your first one.`}
        </TypewriterText>
        {createHref && (
          <Link href={createHref}>
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Plus size={16} />}
            >
              {createLabel}
            </Button>
          </Link>
        )}
      </div>
    </TerminalCard>
  )
}

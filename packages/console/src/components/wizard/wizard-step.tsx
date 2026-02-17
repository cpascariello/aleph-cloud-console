import type { ReactNode } from 'react'
import { Heading, Text } from '@/components/data-terminal'

interface WizardStepProps {
  title: string
  description?: string
  children: ReactNode
}

export function WizardStep({
  title,
  description,
  children,
}: WizardStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Heading level={3}>{title}</Heading>
        {description && (
          <Text variant="muted" className="mt-1">
            {description}
          </Text>
        )}
      </div>
      {children}
    </div>
  )
}

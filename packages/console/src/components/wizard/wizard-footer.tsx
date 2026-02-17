'use client'

import type { ReactNode } from 'react'
import { Button, HudLabel } from '@/components/data-terminal'
import { ChevronLeft, ChevronRight, Rocket } from 'lucide-react'

interface WizardFooterProps {
  isFirst: boolean
  isLast: boolean
  canGoNext: boolean
  onBack: () => void
  onNext: () => void
  costSummary?: ReactNode
  nextLabel?: string | undefined
  submitLabel?: string | undefined
}

export function WizardFooter({
  isFirst,
  isLast,
  canGoNext,
  onBack,
  onNext,
  costSummary,
  nextLabel = 'Next',
  submitLabel = 'Deploy',
}: WizardFooterProps) {
  return (
    <div className="flex items-center justify-between border-t border-border pt-4">
      <div className="flex items-center gap-4">
        {!isFirst && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            iconLeft={<ChevronLeft size={14} />}
          >
            Back
          </Button>
        )}
        {costSummary && (
          <div className="flex items-center gap-2">
            <HudLabel>Est. Cost</HudLabel>
            {costSummary}
          </div>
        )}
      </div>
      <Button
        variant={isLast ? 'primary' : 'secondary'}
        size="sm"
        onClick={onNext}
        disabled={!canGoNext}
        iconRight={
          isLast ? <Rocket size={14} /> : <ChevronRight size={14} />
        }
      >
        {isLast ? submitLabel : nextLabel}
      </Button>
    </div>
  )
}

'use client'

import { ProgressBar, HudLabel } from '@/components/data-terminal'
import type { WizardStep } from '@/hooks/use-wizard'

interface WizardProgressProps {
  steps: WizardStep[]
  currentStep: number
  progress: number
  onStepClick?: (index: number) => void
}

export function WizardProgress({
  steps,
  currentStep,
  progress,
  onStepClick,
}: WizardProgressProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isClickable = isCompleted && onStepClick

          return (
            <div key={step.id} className="flex items-center gap-2">
              {index > 0 && (
                <div
                  className={`h-px w-6 ${
                    isCompleted ? 'bg-accent' : 'bg-border'
                  }`}
                />
              )}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={`
                  flex items-center gap-2 px-2 py-1 rounded transition-colors
                  ${isCurrent ? 'text-accent' : ''}
                  ${isCompleted ? 'text-accent/70 hover:text-accent cursor-pointer' : ''}
                  ${!isCompleted && !isCurrent ? 'text-muted-foreground' : ''}
                  ${!isClickable ? 'cursor-default' : ''}
                `}
              >
                <span
                  className={`
                    flex items-center justify-center w-6 h-6 rounded-full
                    text-xs font-mono border
                    ${isCurrent ? 'border-accent bg-accent/10 text-accent' : ''}
                    ${isCompleted ? 'border-accent/50 bg-accent/5 text-accent/70' : ''}
                    ${!isCompleted && !isCurrent ? 'border-border text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted ? '\u2713' : index + 1}
                </span>
                <HudLabel>{step.label}</HudLabel>
              </button>
            </div>
          )
        })}
      </div>
      <ProgressBar value={progress} />
    </div>
  )
}

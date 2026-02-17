'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { TerminalCard, GlowLine } from '@/components/data-terminal'
import { WizardProgress } from '@/components/wizard/wizard-progress'
import { WizardFooter } from '@/components/wizard/wizard-footer'
import type { WizardState } from '@/hooks/use-wizard'

interface WizardShellProps {
  wizard: WizardState
  tag: string
  label: string
  children: ReactNode
  costSummary?: ReactNode
  submitLabel?: string
  backHref?: string
}

export function WizardShell({
  wizard,
  tag,
  label,
  children,
  costSummary,
  submitLabel,
  backHref,
}: WizardShellProps) {
  const router = useRouter()

  return (
    <div className="max-w-3xl mx-auto">
      <TerminalCard tag={tag} label={label}>
        <div className="flex flex-col gap-6 p-4">
          <WizardProgress
            steps={wizard.steps}
            currentStep={wizard.currentStep}
            progress={wizard.progress}
            onStepClick={wizard.goTo}
          />
          <GlowLine />
          {children}
          <GlowLine />
          <WizardFooter
            isFirst={wizard.isFirst}
            isLast={wizard.isLast}
            canGoNext={wizard.canGoNext}
            onBack={
              wizard.isFirst && backHref
                ? () => router.push(backHref)
                : wizard.goBack
            }
            onNext={wizard.goNext}
            costSummary={costSummary}
            submitLabel={submitLabel}
          />
        </div>
      </TerminalCard>
    </div>
  )
}

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
  variant?: 'page' | 'drawer' | undefined
  children: ReactNode
  costSummary?: ReactNode | undefined
  submitLabel?: string | undefined
  backHref?: string | undefined
  onBack?: (() => void) | undefined
}

export function WizardShell({
  wizard,
  tag,
  label,
  variant = 'page',
  children,
  costSummary,
  submitLabel,
  backHref,
  onBack,
}: WizardShellProps) {
  const router = useRouter()

  const handleBack = wizard.isFirst
    ? (onBack ?? (backHref ? () => router.push(backHref) : undefined))
    : wizard.goBack

  const content = (
    <>
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
        onBack={handleBack ?? wizard.goBack}
        onNext={wizard.goNext}
        costSummary={costSummary}
        submitLabel={submitLabel}
      />
    </>
  )

  if (variant === 'drawer') {
    return <div className="flex flex-col gap-6">{content}</div>
  }

  return (
    <div className="max-w-5xl mx-auto">
      <TerminalCard tag={tag} label={label}>
        <div className="flex flex-col gap-6 p-4">{content}</div>
      </TerminalCard>
    </div>
  )
}

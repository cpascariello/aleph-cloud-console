'use client'

import { TerminalCard, ProgressBar, Button, StatusDot } from '@/components/data-terminal'
import { WizardStep } from '@/components/wizard/wizard-step'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

export type DeployStage = 'idle' | 'deploying' | 'success' | 'error'

interface DeployStep {
  label: string
  status: 'pending' | 'active' | 'done' | 'error'
}

interface DeployProgressProps {
  stage: DeployStage
  steps: DeployStep[]
  error?: string | undefined
  instanceId?: string | undefined
}

export function DeployProgress({
  stage,
  steps,
  error,
  instanceId,
}: DeployProgressProps) {
  const completedCount = steps.filter((s) => s.status === 'done').length

  return (
    <WizardStep title="Deploying Instance">
      <TerminalCard tag="DEPLOY" label="Deployment Progress">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-2">
            {steps.map((step, i) => (
              <div
                key={step.label}
                className="flex items-center gap-3 font-mono text-sm"
              >
                <StatusDot
                  variant={
                    step.status === 'done'
                      ? 'success'
                      : step.status === 'active'
                        ? 'warning'
                        : step.status === 'error'
                          ? 'error'
                          : 'neutral'
                  }
                />
                <span
                  className={
                    step.status === 'done'
                      ? 'text-accent'
                      : step.status === 'active'
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                  }
                >
                  [{completedCount > i ? '\u2713' : step.status === 'active' ? '\u25CF' : ' '}]{' '}
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {stage === 'deploying' && (
            <ProgressBar indeterminate />
          )}
          {stage === 'success' && <ProgressBar value={100} />}
          {stage === 'error' && (
            <div className="text-error text-sm font-mono">
              Error: {error ?? 'Deployment failed'}
            </div>
          )}

          {stage === 'success' && instanceId && (
            <div className="flex justify-end pt-2">
              <Link href={`/compute/${instanceId}`}>
                <Button
                  variant="primary"
                  size="sm"
                  iconRight={<ExternalLink size={14} />}
                >
                  View Instance
                </Button>
              </Link>
            </div>
          )}
        </div>
      </TerminalCard>
    </WizardStep>
  )
}

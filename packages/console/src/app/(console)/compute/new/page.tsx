'use client'

import { useCallback, useMemo, useState } from 'react'
import { WizardShell } from '@/components/wizard/wizard-shell'
import {
  TemplateStep,
  type Template,
} from '@/components/compute/wizard/template-step'
import {
  ConfigureStep,
  type ConfigureData,
} from '@/components/compute/wizard/configure-step'
import {
  AccessStep,
  type AccessData,
} from '@/components/compute/wizard/access-step'
import {
  NetworkingStep,
  type NetworkingData,
} from '@/components/compute/wizard/networking-step'
import { ReviewStep } from '@/components/compute/wizard/review-step'
import {
  DeployProgress,
  type DeployStage,
} from '@/components/compute/wizard/deploy-progress'
import { useWizard, type WizardStep } from '@/hooks/use-wizard'
import { useCreateInstance } from '@/hooks/mutations/use-create-instance'
import { useSSHKeys } from '@/hooks/queries/use-ssh-keys'
import {
  BlockchainId,
  InstanceImageId,
  PaymentMethod,
} from 'aleph-sdk'
import type { AddInstance, HoldPaymentConfiguration } from 'aleph-sdk'
import { PageHeader } from '@/components/shell/page-header'

const STEPS: WizardStep[] = [
  { id: 'template', label: 'Template' },
  { id: 'configure', label: 'Configure' },
  { id: 'access', label: 'Access' },
  { id: 'networking', label: 'Networking', optional: true },
  { id: 'review', label: 'Review' },
]

export default function NewInstancePage() {
  const createInstance = useCreateInstance()
  const { data: sshKeys = [] } = useSSHKeys()
  const [deployStage, setDeployStage] = useState<DeployStage>('idle')
  const [deployError, setDeployError] = useState<string>()
  const [instanceId, setInstanceId] = useState<string>()

  const handleComplete = useCallback(
    async (data: Record<string, unknown>) => {
      const configure = data['configure'] as ConfigureData | undefined
      const access = data['access'] as AccessData | undefined

      if (!configure || !access) return

      const selectedKeys = sshKeys
        .filter((k) => access.selectedKeyIds.includes(k.key))
        .map((k) => ({
          key: k.key,
          label: k.label ?? k.key.slice(0, 20),
          isSelected: true,
          isNew: false,
        }))

      const input: AddInstance = {
        name: access.name,
        tags: access.tags,
        image: configure.image,
        specs: {
          cpu: configure.cpu,
          ram: configure.ram,
          storage: configure.storage,
        },
        sshKeys: selectedKeys,
        systemVolume: { size: configure.storage },
        payment: {
          chain: BlockchainId.ETH,
          type: PaymentMethod.Hold,
        } satisfies HoldPaymentConfiguration,
      }

      setDeployStage('deploying')
      try {
        const result = await createInstance.mutateAsync(input)
        const created = Array.isArray(result) ? result[0] : result
        setInstanceId(created?.id)
        setDeployStage('success')
      } catch (err) {
        setDeployError(
          err instanceof Error ? err.message : 'Deployment failed',
        )
        setDeployStage('error')
      }
    },
    [createInstance, sshKeys],
  )

  const wizard = useWizard({
    steps: STEPS,
    storageKey: 'instance-new',
    onComplete: handleComplete,
  })

  const deploySteps = useMemo(
    () => [
      {
        label: 'Validating configuration',
        status:
          deployStage === 'idle'
            ? ('pending' as const)
            : ('done' as const),
      },
      {
        label: 'Creating instance on network',
        status:
          deployStage === 'deploying'
            ? ('active' as const)
            : deployStage === 'success'
              ? ('done' as const)
              : deployStage === 'error'
                ? ('error' as const)
                : ('pending' as const),
      },
      {
        label: 'Configuring SSH access',
        status:
          deployStage === 'success'
            ? ('done' as const)
            : ('pending' as const),
      },
      {
        label: 'Finalizing deployment',
        status:
          deployStage === 'success'
            ? ('done' as const)
            : ('pending' as const),
      },
    ],
    [deployStage],
  )

  if (deployStage !== 'idle') {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader />
        <div className="max-w-3xl mx-auto w-full">
          <DeployProgress
            stage={deployStage}
            steps={deploySteps}
            error={deployError}
            instanceId={instanceId}
          />
        </div>
      </div>
    )
  }

  const configure = wizard.getStepData<ConfigureData>('configure')
  const access = wizard.getStepData<AccessData>('access')
  const networking = wizard.getStepData<NetworkingData>('networking')

  function handleSelectTemplate(template: Template) {
    wizard.setStepData('configure', {
      paymentMethod: PaymentMethod.Hold,
      tier: 'custom',
      cpu: template.cpu,
      ram: template.ram,
      storage: template.storage,
      image: InstanceImageId.Ubuntu24,
    } satisfies ConfigureData)
    wizard.goTo(4)
  }

  const stepContent = [
    <TemplateStep
      key="template"
      onSelectTemplate={handleSelectTemplate}
      onStartFromScratch={() => wizard.goNext()}
      setValid={wizard.setCanGoNext}
    />,
    <ConfigureStep
      key="configure"
      data={configure}
      onChange={(d) => wizard.setStepData('configure', d)}
      setValid={wizard.setCanGoNext}
    />,
    <AccessStep
      key="access"
      data={access}
      onChange={(d) => wizard.setStepData('access', d)}
      setValid={wizard.setCanGoNext}
    />,
    <NetworkingStep
      key="networking"
      data={networking}
      onChange={(d) => wizard.setStepData('networking', d)}
      setValid={wizard.setCanGoNext}
      onSkip={() => wizard.goNext()}
    />,
    <ReviewStep
      key="review"
      configure={configure}
      access={access}
      networking={networking}
      setValid={wizard.setCanGoNext}
    />,
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <WizardShell
        wizard={wizard}
        tag="NEW"
        label="Instance"
        submitLabel="Deploy Instance"
        backHref="/compute"
      >
        {stepContent[wizard.currentStep]}
      </WizardShell>
    </div>
  )
}

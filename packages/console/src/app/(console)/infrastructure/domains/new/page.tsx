'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  SearchInput,
  Select,
  HudLabel,
  GlowLine,
  Badge,
  Text,
} from '@/components/data-terminal'
import { WizardShell } from '@/components/wizard/wizard-shell'
import { WizardStep } from '@/components/wizard/wizard-step'
import { PageHeader } from '@/components/shell/page-header'
import { useWizard, type WizardStep as WizardStepDef } from '@/hooks/use-wizard'
import { useInstances } from '@/hooks/queries/use-instances'
import { usePrograms } from '@/hooks/queries/use-programs'
import { EntityDomainType } from 'aleph-sdk'
import { Globe } from 'lucide-react'
import { truncateHash } from '@/lib/format'

const STEPS: WizardStepDef[] = [
  { id: 'configure', label: 'Configure' },
  { id: 'review', label: 'Review' },
]

interface DomainConfig {
  name: string
  targetType: string
  targetRef: string
}

function ConfigureDomainStep({
  data,
  onChange,
  setValid,
}: {
  data: DomainConfig | undefined
  onChange: (d: DomainConfig) => void
  setValid: (v: boolean) => void
}) {
  const { data: instances = [] } = useInstances()
  const { data: programs = [] } = usePrograms()
  const [name, setName] = useState(data?.name ?? '')
  const [targetType, setTargetType] = useState(
    data?.targetType ?? EntityDomainType.Instance,
  )
  const [targetRef, setTargetRef] = useState(data?.targetRef ?? '')

  const targetOptions = useMemo(() => {
    if (targetType === EntityDomainType.Instance) {
      return instances.map((i) => ({
        value: i.id,
        label: i.name || truncateHash(i.id),
      }))
    }
    return programs.map((p) => ({
      value: p.id,
      label: p.name || truncateHash(p.id),
    }))
  }, [targetType, instances, programs])

  useEffect(() => {
    const valid =
      name.trim().length > 0 && targetRef.length > 0
    setValid(valid)
    onChange({ name: name.trim(), targetType, targetRef })
  }, [name, targetType, targetRef, onChange, setValid])

  return (
    <WizardStep
      title="Configure Domain"
      description="Enter your domain name and link it to a resource."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <HudLabel>Domain Name</HudLabel>
          <SearchInput
            value={name}
            onChange={setName}
            placeholder="app.example.com"
          />
        </div>
        <Select
          label="Target Type"
          options={[
            { value: EntityDomainType.Instance, label: 'Instance' },
            { value: EntityDomainType.Program, label: 'Function' },
            { value: EntityDomainType.IPFS, label: 'IPFS' },
          ]}
          value={targetType}
          onChange={(v) => {
            setTargetType(v)
            setTargetRef('')
          }}
        />
        {targetType !== EntityDomainType.IPFS ? (
          <Select
            label="Target Resource"
            options={targetOptions}
            value={targetRef}
            onChange={setTargetRef}
            placeholder="Select a resource..."
          />
        ) : (
          <div className="flex flex-col gap-1">
            <HudLabel>IPFS CID</HudLabel>
            <SearchInput
              value={targetRef}
              onChange={setTargetRef}
              placeholder="Qm..."
            />
          </div>
        )}
      </div>
    </WizardStep>
  )
}

function ReviewDomainStep({
  data,
  setValid,
}: {
  data: DomainConfig | undefined
  setValid: (v: boolean) => void
}) {
  useEffect(() => {
    setValid(Boolean(data && data.name && data.targetRef))
  }, [data, setValid])

  if (!data) {
    return (
      <WizardStep title="Review">
        <Text variant="muted">Complete the previous step first.</Text>
      </WizardStep>
    )
  }

  return (
    <WizardStep
      title="Review & Create"
      description="Confirm your domain configuration."
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <HudLabel>Domain</HudLabel>
          <span className="flex items-center gap-2 font-mono text-accent">
            <Globe size={14} />
            {data.name}
          </span>
        </div>
        <GlowLine />
        <div className="flex items-center gap-3">
          <HudLabel>Target</HudLabel>
          <Badge variant="info">{data.targetType}</Badge>
          <span className="font-mono text-sm text-muted-foreground">
            {truncateHash(data.targetRef)}
          </span>
        </div>
      </div>
    </WizardStep>
  )
}

export default function NewDomainPage() {
  const router = useRouter()

  const handleComplete = useCallback(
    (_data: Record<string, unknown>) => {
      // TODO: Wire to useCreateDomain mutation
      router.push('/infrastructure/domains')
    },
    [router],
  )

  const wizard = useWizard({
    steps: STEPS,
    storageKey: 'domain-new',
    onComplete: handleComplete,
  })

  const config = wizard.getStepData<DomainConfig>('configure')

  const stepContent = useMemo(
    () => [
      <ConfigureDomainStep
        key="configure"
        data={config}
        onChange={(d) => wizard.setStepData('configure', d)}
        setValid={wizard.setCanGoNext}
      />,
      <ReviewDomainStep
        key="review"
        data={config}
        setValid={wizard.setCanGoNext}
      />,
    ],
    [config, wizard],
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <WizardShell
        wizard={wizard}
        tag="NEW"
        label="Domain"
        submitLabel="Create Domain"
        backHref="/infrastructure/domains"
      >
        {stepContent[wizard.currentStep]}
      </WizardShell>
    </div>
  )
}

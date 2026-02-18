'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  SearchInput,
  RadioGroup,
  HudLabel,
  GlowLine,
  Badge,
  Text,
} from '@/components/data-terminal'
import { WizardShell } from '@/components/wizard/wizard-shell'
import { WizardStep } from '@/components/wizard/wizard-step'
import { useWizard, type WizardStep as WizardStepDef } from '@/hooks/use-wizard'
import { VolumeType } from 'aleph-sdk'
import { HardDrive } from 'lucide-react'

const STEPS: WizardStepDef[] = [
  { id: 'configure', label: 'Configure' },
  { id: 'review', label: 'Review' },
]

interface VolumeConfig {
  name: string
  volumeType: string
  size: number
}

function ConfigureVolumeStep({
  data,
  onChange,
  setValid,
}: {
  data: VolumeConfig | undefined
  onChange: (d: VolumeConfig) => void
  setValid: (v: boolean) => void
}) {
  const [name, setName] = useState(data?.name ?? '')
  const [volumeType, setVolumeType] = useState(
    data?.volumeType ?? VolumeType.Persistent,
  )
  const [size, setSize] = useState(data?.size ?? 10)

  useEffect(() => {
    const valid = name.trim().length > 0 && size > 0
    setValid(valid)
    onChange({ name: name.trim(), volumeType, size })
  }, [name, volumeType, size, onChange, setValid])

  return (
    <WizardStep
      title="Configure Volume"
      description="Set up your new storage volume."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <HudLabel>Volume Name</HudLabel>
          <SearchInput
            value={name}
            onChange={setName}
            placeholder="my-volume"
          />
        </div>
        <RadioGroup
          label="Volume Type"
          options={[
            { value: VolumeType.Persistent, label: 'Persistent' },
            { value: VolumeType.New, label: 'Immutable' },
          ]}
          value={volumeType}
          onChange={setVolumeType}
        />
        <div className="flex flex-col gap-1">
          <HudLabel>Size (GB)</HudLabel>
          <SearchInput
            value={String(size)}
            onChange={(v) => setSize(Number(v) || 0)}
            placeholder="10"
          />
        </div>
      </div>
    </WizardStep>
  )
}

function ReviewVolumeStep({
  data,
  setValid,
}: {
  data: VolumeConfig | undefined
  setValid: (v: boolean) => void
}) {
  useEffect(() => {
    setValid(Boolean(data))
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
      description="Confirm your volume configuration."
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <HudLabel>Name</HudLabel>
          <span className="font-mono text-accent">{data.name}</span>
        </div>
        <GlowLine />
        <div className="flex items-center gap-3">
          <HudLabel>Type</HudLabel>
          <Badge variant="info">{data.volumeType}</Badge>
        </div>
        <GlowLine />
        <div className="flex items-center gap-3">
          <HudLabel>Size</HudLabel>
          <span className="flex items-center gap-1">
            <HardDrive size={14} className="text-accent" />
            {data.size} GB
          </span>
        </div>
      </div>
    </WizardStep>
  )
}

interface VolumeWizardContentProps {
  variant?: 'page' | 'drawer'
  onComplete?: () => void
  onBack?: () => void
}

export function VolumeWizardContent({
  variant = 'page',
  onComplete,
  onBack,
}: VolumeWizardContentProps) {
  const router = useRouter()

  const handleComplete = useCallback(
    (_data: Record<string, unknown>) => {
      if (onComplete) {
        onComplete()
      } else {
        router.push('/infrastructure/volumes')
      }
    },
    [router, onComplete],
  )

  const wizard = useWizard({
    steps: STEPS,
    storageKey: 'volume-new',
    onComplete: handleComplete,
  })

  const config = wizard.getStepData<VolumeConfig>('configure')

  const handleConfigChange = useCallback(
    (d: VolumeConfig) => wizard.setStepData('configure', d),
    [wizard.setStepData],
  )

  const stepContent = useMemo(
    () => [
      <ConfigureVolumeStep
        key="configure"
        data={config}
        onChange={handleConfigChange}
        setValid={wizard.setCanGoNext}
      />,
      <ReviewVolumeStep
        key="review"
        data={config}
        setValid={wizard.setCanGoNext}
      />,
    ],
    [config, handleConfigChange, wizard.setCanGoNext],
  )

  return (
    <WizardShell
      wizard={wizard}
      tag="NEW"
      label="Volume"
      variant={variant}
      submitLabel="Create Volume"
      backHref={variant === 'page' ? '/infrastructure/volumes' : undefined}
      onBack={onBack}
    >
      {stepContent[wizard.currentStep]}
    </WizardShell>
  )
}

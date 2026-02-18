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
import { useWizard, type WizardStep as WizardStepDef } from '@/hooks/use-wizard'
import { WebsiteFrameworkId } from 'aleph-sdk'
import { FileCode } from 'lucide-react'

const STEPS: WizardStepDef[] = [
  { id: 'framework', label: 'Framework' },
  { id: 'configure', label: 'Configure' },
  { id: 'review', label: 'Review' },
]

const FRAMEWORK_OPTIONS = [
  { value: WebsiteFrameworkId.React, label: 'React' },
  { value: WebsiteFrameworkId.Vue, label: 'Vue' },
  { value: WebsiteFrameworkId.Nextjs, label: 'Next.js' },
  { value: WebsiteFrameworkId.None, label: 'Static HTML' },
]

interface WebsiteFrameworkData {
  framework: string
}

interface WebsiteConfigData {
  name: string
  cid: string
}

function FrameworkStep({
  data,
  onChange,
  setValid,
}: {
  data: WebsiteFrameworkData | undefined
  onChange: (d: WebsiteFrameworkData) => void
  setValid: (v: boolean) => void
}) {
  const [framework, setFramework] = useState(
    data?.framework ?? WebsiteFrameworkId.React,
  )

  useEffect(() => {
    setValid(true)
    onChange({ framework })
  }, [framework, onChange, setValid])

  return (
    <WizardStep
      title="Choose Framework"
      description="Select the framework your website was built with."
    >
      <Select
        label="Framework"
        options={FRAMEWORK_OPTIONS}
        value={framework}
        onChange={setFramework}
      />
    </WizardStep>
  )
}

function ConfigureWebsiteStep({
  data,
  onChange,
  setValid,
}: {
  data: WebsiteConfigData | undefined
  onChange: (d: WebsiteConfigData) => void
  setValid: (v: boolean) => void
}) {
  const [name, setName] = useState(data?.name ?? '')
  const [cid, setCid] = useState(data?.cid ?? '')

  useEffect(() => {
    const valid = name.trim().length > 0 && cid.trim().length > 0
    setValid(valid)
    onChange({ name: name.trim(), cid: cid.trim() })
  }, [name, cid, onChange, setValid])

  return (
    <WizardStep
      title="Configure Website"
      description="Name your website and provide the IPFS CID of your build output."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <HudLabel>Website Name</HudLabel>
          <SearchInput
            value={name}
            onChange={setName}
            placeholder="my-website"
          />
        </div>
        <div className="flex flex-col gap-1">
          <HudLabel>Build Output CID</HudLabel>
          <SearchInput
            value={cid}
            onChange={setCid}
            placeholder="Qm... or bafy..."
          />
          <Text variant="small" className="text-muted-foreground mt-1">
            Upload your build folder to IPFS first, then paste the CID here.
          </Text>
        </div>
      </div>
    </WizardStep>
  )
}

function ReviewWebsiteStep({
  framework,
  config,
  setValid,
}: {
  framework: WebsiteFrameworkData | undefined
  config: WebsiteConfigData | undefined
  setValid: (v: boolean) => void
}) {
  useEffect(() => {
    setValid(Boolean(framework && config && config.name && config.cid))
  }, [framework, config, setValid])

  if (!framework || !config) {
    return (
      <WizardStep title="Review">
        <Text variant="muted">Complete the previous steps first.</Text>
      </WizardStep>
    )
  }

  const frameworkLabel =
    FRAMEWORK_OPTIONS.find((f) => f.value === framework.framework)?.label ??
    framework.framework

  return (
    <WizardStep
      title="Review & Deploy"
      description="Confirm your website configuration."
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <HudLabel>Name</HudLabel>
          <span className="flex items-center gap-2 font-mono text-accent">
            <FileCode size={14} />
            {config.name}
          </span>
        </div>
        <GlowLine />
        <div className="flex items-center gap-3">
          <HudLabel>Framework</HudLabel>
          <Badge variant="info">{frameworkLabel}</Badge>
        </div>
        <GlowLine />
        <div className="flex items-center gap-3">
          <HudLabel>CID</HudLabel>
          <span className="font-mono text-sm text-muted-foreground">
            {config.cid}
          </span>
        </div>
      </div>
    </WizardStep>
  )
}

interface WebsiteWizardContentProps {
  variant?: 'page' | 'drawer'
  onComplete?: () => void
  onBack?: () => void
}

export function WebsiteWizardContent({
  variant = 'page',
  onComplete,
  onBack,
}: WebsiteWizardContentProps) {
  const router = useRouter()

  const handleComplete = useCallback(
    (_data: Record<string, unknown>) => {
      if (onComplete) {
        onComplete()
      } else {
        router.push('/infrastructure/websites')
      }
    },
    [router, onComplete],
  )

  const wizard = useWizard({
    steps: STEPS,
    storageKey: 'website-new',
    onComplete: handleComplete,
  })

  const framework = wizard.getStepData<WebsiteFrameworkData>('framework')
  const config = wizard.getStepData<WebsiteConfigData>('configure')

  const handleFrameworkChange = useCallback(
    (d: WebsiteFrameworkData) => wizard.setStepData('framework', d),
    [wizard.setStepData],
  )

  const handleConfigChange = useCallback(
    (d: WebsiteConfigData) => wizard.setStepData('configure', d),
    [wizard.setStepData],
  )

  const stepContent = useMemo(
    () => [
      <FrameworkStep
        key="framework"
        data={framework}
        onChange={handleFrameworkChange}
        setValid={wizard.setCanGoNext}
      />,
      <ConfigureWebsiteStep
        key="configure"
        data={config}
        onChange={handleConfigChange}
        setValid={wizard.setCanGoNext}
      />,
      <ReviewWebsiteStep
        key="review"
        framework={framework}
        config={config}
        setValid={wizard.setCanGoNext}
      />,
    ],
    [framework, config, handleFrameworkChange, handleConfigChange, wizard.setCanGoNext],
  )

  return (
    <WizardShell
      wizard={wizard}
      tag="NEW"
      label="Website"
      variant={variant}
      submitLabel="Deploy Website"
      backHref={variant === 'page' ? '/infrastructure/websites' : undefined}
      onBack={onBack}
    >
      {stepContent[wizard.currentStep]}
    </WizardShell>
  )
}

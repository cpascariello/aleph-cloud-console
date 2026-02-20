'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  SearchInput,
  Select,
  HudLabel,
  GlowLine,
  Badge,
  ProgressBar,
  Button,
  StatusDot,
  TerminalCard,
  Text,
} from '@/components/data-terminal'
import { WizardShell } from '@/components/wizard/wizard-shell'
import { WizardStep } from '@/components/wizard/wizard-step'
import { useWizard, type WizardStep as WizardStepDef } from '@/hooks/use-wizard'
import { useCreateWebsite } from '@/hooks/mutations/use-create-website'
import { FileManager, WebsiteFrameworkId } from 'aleph-sdk'
import type { AddWebsite } from 'aleph-sdk'
import { cn } from '@/lib/cn'
import { FileCode, FolderUp, CheckCircle2, AlertTriangle, X } from 'lucide-react'

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

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; fileCount: number }
  | { status: 'success'; cid: string; fileCount: number }
  | { status: 'error'; message: string }

function FolderUploadZone({
  onUploaded,
  initialCid,
}: {
  onUploaded: (cid: string) => void
  initialCid: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [upload, setUpload] = useState<UploadState>(
    initialCid ? { status: 'success', cid: initialCid, fileCount: 0 } : { status: 'idle' },
  )
  const [dragOver, setDragOver] = useState(false)

  async function handleFiles(files: File[]) {
    if (files.length === 0) return
    setUpload({ status: 'uploading', fileCount: files.length })

    try {
      const cid = await FileManager.uploadFolder(files)
      if (!cid) throw new Error('No CID returned from IPFS')
      setUpload({ status: 'success', cid, fileCount: files.length })
      onUploaded(cid)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setUpload({ status: 'error', message })
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    void handleFiles(files)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    void handleFiles(files)
  }

  function handleClear() {
    setUpload({ status: 'idle' })
    onUploaded('')
    if (inputRef.current) inputRef.current.value = ''
  }

  if (upload.status === 'uploading') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-col items-center gap-3 border border-border bg-foreground/[0.02] px-4 py-6">
          <Text variant="small" className="text-foreground/50">
            Uploading {upload.fileCount} file{upload.fileCount !== 1 ? 's' : ''} to IPFS...
          </Text>
          <ProgressBar indeterminate className="w-full max-w-xs" />
        </div>
      </div>
    )
  }

  if (upload.status === 'success') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 border border-accent/30 bg-accent/[0.04] px-4 py-3">
          <CheckCircle2 size={16} className="shrink-0 text-accent" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Text variant="small" className="text-accent">
              Uploaded to IPFS
              {upload.fileCount > 0 && ` (${upload.fileCount} file${upload.fileCount !== 1 ? 's' : ''})`}
            </Text>
            <span className="truncate font-mono text-xs text-foreground/50">
              {upload.cid}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-foreground/30 transition-colors hover:text-foreground/60"
            aria-label="Clear upload"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  if (upload.status === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-col items-center gap-3 border border-destructive/30 bg-destructive/[0.04] px-4 py-6">
          <AlertTriangle size={20} className="text-destructive" />
          <Text variant="small" className="text-destructive">
            {upload.message}
          </Text>
          <button
            type="button"
            onClick={() => setUpload({ status: 'idle' })}
            className="font-display text-xs text-foreground/50 underline transition-colors hover:text-foreground/80"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 border border-dashed px-4 py-6 transition-colors',
          dragOver
            ? 'border-accent bg-accent/[0.04]'
            : 'border-border bg-foreground/[0.02] hover:border-border-hover hover:bg-foreground/[0.04]',
        )}
      >
        <FolderUp size={24} className={cn(
          'transition-colors',
          dragOver ? 'text-accent' : 'text-foreground/30',
        )} />
        <Text variant="small" className={cn(
          'transition-colors',
          dragOver ? 'text-accent' : 'text-foreground/50',
        )}>
          Drop your build folder here or click to browse
        </Text>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleInputChange}
        /* @ts-expect-error -- webkitdirectory is not in React's type defs */
        webkitdirectory=""
        directory=""
        multiple
      />
    </div>
  )
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

  const handleUploaded = useCallback((uploadedCid: string) => {
    setCid(uploadedCid)
  }, [])

  return (
    <WizardStep
      title="Configure Website"
      description="Upload your build folder and name your website."
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
          <HudLabel>Build Folder</HudLabel>
          <FolderUploadZone onUploaded={handleUploaded} initialCid={cid} />
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

type DeployState = 'idle' | 'deploying' | 'success' | 'error'

function DeployStatusView({
  state,
  error,
  onRetry,
}: {
  state: Exclude<DeployState, 'idle'>
  error?: string | undefined
  onRetry: () => void
}) {
  return (
    <WizardStep title="Deploying Website">
      <TerminalCard tag="DEPLOY" label="Deployment Progress">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 font-mono text-sm">
              <StatusDot
                variant={state === 'deploying' ? 'warning' : 'success'}
              />
              <span className={state === 'deploying' ? 'text-foreground' : 'text-accent'}>
                [{state === 'deploying' ? '\u25CF' : '\u2713'}] Uploading volume to network
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-sm">
              <StatusDot
                variant={
                  state === 'success'
                    ? 'success'
                    : state === 'error'
                      ? 'error'
                      : 'neutral'
                }
              />
              <span
                className={
                  state === 'success'
                    ? 'text-accent'
                    : state === 'error'
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                }
              >
                [{state === 'success' ? '\u2713' : state === 'error' ? '\u2717' : ' '}] Publishing website record
              </span>
            </div>
          </div>

          {state === 'deploying' && <ProgressBar indeterminate />}
          {state === 'success' && <ProgressBar value={100} />}
          {state === 'error' && (
            <div className="flex flex-col gap-3">
              <div className="font-mono text-sm text-destructive">
                Error: {error ?? 'Deployment failed'}
              </div>
              <Button variant="secondary" size="sm" onClick={onRetry}>
                Retry
              </Button>
            </div>
          )}

          {state === 'success' && (
            <Text variant="small" className="text-accent">
              Website deployed
            </Text>
          )}
        </div>
      </TerminalCard>
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
  const createWebsite = useCreateWebsite()
  const [deployState, setDeployState] = useState<DeployState>('idle')
  const [deployError, setDeployError] = useState<string>()

  const handleComplete = useCallback(
    async (data: Record<string, unknown>) => {
      const frameworkData = data['framework'] as
        | WebsiteFrameworkData
        | undefined
      const configData = data['configure'] as
        | WebsiteConfigData
        | undefined

      if (!frameworkData || !configData) return

      const input: AddWebsite = {
        name: configData.name,
        tags: [],
        framework: frameworkData.framework as WebsiteFrameworkId,
        website: { cid: configData.cid },
      }

      setDeployState('deploying')
      setDeployError(undefined)

      try {
        const website = await createWebsite.mutateAsync(input)
        setDeployState('success')
        localStorage.removeItem('wizard-website-new')
        const detailPath = `/infrastructure/websites/${website.id}`
        setTimeout(() => {
          onComplete?.()
          router.push(detailPath)
        }, 1500)
      } catch (err) {
        setDeployError(
          err instanceof Error ? err.message : 'Deployment failed',
        )
        setDeployState('error')
      }
    },
    [createWebsite, onComplete, router],
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

  if (deployState !== 'idle') {
    return (
      <DeployStatusView
        state={deployState}
        error={deployError}
        onRetry={() => setDeployState('idle')}
      />
    )
  }

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

'use client'

import { useEffect, useState } from 'react'
import {
  RadioGroup,
  Select,
  TerminalCard,
  Accordion,
  SearchInput,
  HudLabel,
  Text,
} from '@/components/data-terminal'
import { WizardStep } from '@/components/wizard/wizard-step'
import {
  InstanceImageId,
  InstanceImages,
  PaymentMethod,
} from 'aleph-sdk'
import { Cpu, MemoryStick, HardDrive } from 'lucide-react'

interface ConfigureData {
  paymentMethod: PaymentMethod
  tier: string
  cpu: number
  ram: number
  storage: number
  image: string
}

interface ConfigureStepProps {
  data: ConfigureData | undefined
  onChange: (data: ConfigureData) => void
  setValid: (valid: boolean) => void
}

const TIERS = [
  { value: 'starter', label: 'Starter', cpu: 1, ram: 2048, storage: 20 },
  { value: 'standard', label: 'Standard', cpu: 2, ram: 4096, storage: 40 },
  { value: 'pro', label: 'Pro', cpu: 4, ram: 8192, storage: 80 },
  { value: 'custom', label: 'Custom', cpu: 0, ram: 0, storage: 0 },
]

const IMAGE_OPTIONS = Object.values(InstanceImages).map((img) => ({
  value: img.id,
  label: img.name,
}))

export type { ConfigureData }

export function ConfigureStep({
  data,
  onChange,
  setValid,
}: ConfigureStepProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    data?.paymentMethod ?? PaymentMethod.Hold,
  )
  const [tier, setTier] = useState(data?.tier ?? 'starter')
  const [cpu, setCpu] = useState(data?.cpu ?? 1)
  const [ram, setRam] = useState(data?.ram ?? 2048)
  const [storage, setStorage] = useState(data?.storage ?? 20)
  const [image, setImage] = useState(
    data?.image ?? InstanceImageId.Ubuntu24,
  )

  useEffect(() => {
    const selectedTier = TIERS.find((t) => t.value === tier)
    if (selectedTier && tier !== 'custom') {
      setCpu(selectedTier.cpu)
      setRam(selectedTier.ram)
      setStorage(selectedTier.storage)
    }
  }, [tier])

  useEffect(() => {
    const isValid = cpu > 0 && ram > 0 && storage > 0 && image.length > 0
    setValid(isValid)
    if (isValid) {
      onChange({ paymentMethod, tier, cpu, ram, storage, image })
    }
  }, [paymentMethod, tier, cpu, ram, storage, image, onChange, setValid])

  return (
    <WizardStep
      title="Configure Resources"
      description="Choose your payment method, resource tier, and operating system."
    >
      <div className="flex flex-col gap-6">
        <RadioGroup
          label="Payment Method"
          options={[
            { value: PaymentMethod.Hold, label: 'Hold tokens' },
            { value: PaymentMethod.Stream, label: 'Pay-as-you-go' },
          ]}
          value={paymentMethod}
          onChange={(v) => setPaymentMethod(v as PaymentMethod)}
        />

        <div className="flex flex-col gap-3">
          <HudLabel>Resource Tier</HudLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TIERS.map((t) => (
              <TerminalCard
                key={t.value}
                tag={t.value === tier ? 'SELECTED' : ''}
                label={t.label}
              >
                <button
                  type="button"
                  onClick={() => setTier(t.value)}
                  className={`
                    w-full text-left p-3 transition-colors
                    ${t.value === tier ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}
                  `}
                >
                  {t.value !== 'custom' ? (
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="flex items-center gap-1">
                        <Cpu size={12} /> {t.cpu} vCPU
                      </span>
                      <span className="flex items-center gap-1">
                        <MemoryStick size={12} />{' '}
                        {t.ram >= 1024
                          ? `${t.ram / 1024} GB`
                          : `${t.ram} MB`}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive size={12} /> {t.storage} GB
                      </span>
                    </div>
                  ) : (
                    <Text variant="small">Configure your own specs</Text>
                  )}
                </button>
              </TerminalCard>
            ))}
          </div>
        </div>

        {tier === 'custom' && (
          <Accordion
            items={[
              {
                id: 'custom-specs',
                title: 'Custom Specifications',
                children: (
                  <div className="flex flex-col gap-4 py-2">
                    <div className="flex flex-col gap-1">
                      <HudLabel>CPU (vCPU)</HudLabel>
                      <SearchInput
                        value={String(cpu)}
                        onChange={(v) => setCpu(Number(v) || 0)}
                        placeholder="e.g. 2"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <HudLabel>RAM (MB)</HudLabel>
                      <SearchInput
                        value={String(ram)}
                        onChange={(v) => setRam(Number(v) || 0)}
                        placeholder="e.g. 4096"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <HudLabel>Storage (GB)</HudLabel>
                      <SearchInput
                        value={String(storage)}
                        onChange={(v) => setStorage(Number(v) || 0)}
                        placeholder="e.g. 40"
                      />
                    </div>
                  </div>
                ),
              },
            ]}
            defaultOpen={['custom-specs']}
          />
        )}

        <Select
          label="Operating System"
          options={IMAGE_OPTIONS}
          value={image}
          onChange={(v) => setImage(v)}
        />
      </div>
    </WizardStep>
  )
}

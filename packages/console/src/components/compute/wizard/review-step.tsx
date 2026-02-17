'use client'

import { useEffect } from 'react'
import {
  Badge,
  GlowLine,
  HudLabel,
  Text,
} from '@/components/data-terminal'
import { WizardStep } from '@/components/wizard/wizard-step'
import { InstanceImages } from 'aleph-sdk'
import type { ConfigureData } from '@/components/compute/wizard/configure-step'
import type { AccessData } from '@/components/compute/wizard/access-step'
import type { NetworkingData } from '@/components/compute/wizard/networking-step'
import { Cpu, MemoryStick, HardDrive, Key, Globe } from 'lucide-react'

interface ReviewStepProps {
  configure: ConfigureData | undefined
  access: AccessData | undefined
  networking: NetworkingData | undefined
  setValid: (valid: boolean) => void
}

export function ReviewStep({
  configure,
  access,
  networking,
  setValid,
}: ReviewStepProps) {
  useEffect(() => {
    setValid(Boolean(configure && access))
  }, [configure, access, setValid])

  if (!configure || !access) {
    return (
      <WizardStep title="Review & Deploy">
        <Text variant="muted">
          Please complete the previous steps first.
        </Text>
      </WizardStep>
    )
  }

  const imageName =
    Object.values(InstanceImages).find((img) => img.id === configure.image)
      ?.name ?? 'Unknown'

  return (
    <WizardStep
      title="Review & Deploy"
      description="Confirm your configuration before deploying."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <HudLabel>Instance</HudLabel>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-mono text-accent">{access.name}</span>
            {access.tags.length > 0 && (
              <div className="flex gap-1">
                {access.tags.map((tag) => (
                  <Badge key={tag} variant="neutral">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <GlowLine />

        <div className="flex flex-col gap-2">
          <HudLabel>Resources</HudLabel>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <span className="flex items-center gap-2">
              <Cpu size={14} className="text-accent" />
              {configure.cpu} vCPU
            </span>
            <span className="flex items-center gap-2">
              <MemoryStick size={14} className="text-accent" />
              {configure.ram >= 1024
                ? `${configure.ram / 1024} GB RAM`
                : `${configure.ram} MB RAM`}
            </span>
            <span className="flex items-center gap-2">
              <HardDrive size={14} className="text-accent" />
              {configure.storage} GB SSD
            </span>
          </div>
        </div>

        <GlowLine />

        <div className="flex flex-col gap-2">
          <HudLabel>System</HudLabel>
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="info">{imageName}</Badge>
            <span className="text-muted-foreground">
              Payment: {configure.paymentMethod}
            </span>
          </div>
        </div>

        <GlowLine />

        <div className="flex flex-col gap-2">
          <HudLabel>Access</HudLabel>
          <div className="flex items-center gap-2 text-sm">
            <Key size={14} className="text-accent" />
            <span>
              {access.selectedKeyIds.length} SSH key
              {access.selectedKeyIds.length !== 1 ? 's' : ''} selected
            </span>
          </div>
        </div>

        {networking &&
          (networking.attachVolumeIds.length > 0 ||
            networking.newDomainName) && (
            <>
              <GlowLine />
              <div className="flex flex-col gap-2">
                <HudLabel>Networking</HudLabel>
                <div className="flex flex-col gap-1 text-sm">
                  {networking.attachVolumeIds.length > 0 && (
                    <span>
                      {networking.attachVolumeIds.length} volume
                      {networking.attachVolumeIds.length !== 1
                        ? 's'
                        : ''}{' '}
                      attached
                    </span>
                  )}
                  {networking.newDomainName && (
                    <span className="flex items-center gap-2">
                      <Globe size={14} className="text-accent" />
                      {networking.newDomainName}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
      </div>
    </WizardStep>
  )
}

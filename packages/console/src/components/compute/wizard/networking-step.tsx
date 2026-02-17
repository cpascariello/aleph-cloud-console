'use client'

import { useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  SearchInput,
  Skeleton,
  HudLabel,
  Text,
} from '@/components/data-terminal'
import { WizardStep } from '@/components/wizard/wizard-step'
import { useVolumes } from '@/hooks/queries/use-volumes'
import { truncateHash } from '@/lib/format'

interface NetworkingData {
  attachVolumeIds: string[]
  newDomainName: string
}

interface NetworkingStepProps {
  data: NetworkingData | undefined
  onChange: (data: NetworkingData) => void
  setValid: (valid: boolean) => void
  onSkip: () => void
}

export type { NetworkingData }

export function NetworkingStep({
  data,
  onChange,
  setValid,
  onSkip,
}: NetworkingStepProps) {
  const { data: volumes = [], isLoading: volumesLoading } = useVolumes()
  const [attachVolumeIds, setAttachVolumeIds] = useState<Set<string>>(
    new Set(data?.attachVolumeIds ?? []),
  )
  const [domainName, setDomainName] = useState(data?.newDomainName ?? '')

  useEffect(() => {
    setValid(true)
    onChange({
      attachVolumeIds: Array.from(attachVolumeIds),
      newDomainName: domainName.trim(),
    })
  }, [attachVolumeIds, domainName, onChange, setValid])

  function toggleVolume(id: string) {
    setAttachVolumeIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <WizardStep
      title="Networking"
      description="Optionally attach volumes and link a domain. You can skip this step."
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <HudLabel>Attach Volumes</HudLabel>
          {volumesLoading ? (
            <Skeleton variant="text" />
          ) : volumes.length === 0 ? (
            <Text variant="muted">
              No volumes available. You can create one later.
            </Text>
          ) : (
            <div className="flex flex-col gap-2">
              {volumes.map((vol) => (
                <Checkbox
                  key={vol.id}
                  checked={attachVolumeIds.has(vol.id)}
                  onChange={() => toggleVolume(vol.id)}
                >
                  <span className="font-mono text-sm">
                    {'name' in vol && vol.name
                      ? vol.name
                      : truncateHash(vol.id)}
                  </span>
                </Checkbox>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <HudLabel>Custom Domain (optional)</HudLabel>
          <SearchInput
            value={domainName}
            onChange={setDomainName}
            placeholder="app.example.com"
          />
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip this step
          </Button>
        </div>
      </div>
    </WizardStep>
  )
}

'use client'

import { useEffect, useState } from 'react'
import {
  Checkbox,
  SearchInput,
  Skeleton,
  HudLabel,
  Text,
} from '@/components/data-terminal'
import { WizardStep } from '@/components/wizard/wizard-step'
import { useSSHKeys } from '@/hooks/queries/use-ssh-keys'

interface AccessData {
  name: string
  tags: string[]
  selectedKeyIds: string[]
}

interface AccessStepProps {
  data: AccessData | undefined
  onChange: (data: AccessData) => void
  setValid: (valid: boolean) => void
}

export type { AccessData }

export function AccessStep({
  data,
  onChange,
  setValid,
}: AccessStepProps) {
  const { data: sshKeys = [], isLoading } = useSSHKeys()
  const [name, setName] = useState(data?.name ?? '')
  const [tags, setTags] = useState(data?.tags?.join(', ') ?? '')
  const [selectedKeyIds, setSelectedKeyIds] = useState<Set<string>>(
    new Set(data?.selectedKeyIds ?? []),
  )

  useEffect(() => {
    const isValid = name.trim().length > 0 && selectedKeyIds.size > 0
    setValid(isValid)
    onChange({
      name: name.trim(),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      selectedKeyIds: Array.from(selectedKeyIds),
    })
  }, [name, tags, selectedKeyIds, onChange, setValid])

  function toggleKey(id: string) {
    setSelectedKeyIds((prev) => {
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
      title="Access & Security"
      description="Name your instance and select SSH keys for access."
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <HudLabel>Instance Name</HudLabel>
          <SearchInput
            value={name}
            onChange={setName}
            placeholder="my-instance"
          />
        </div>

        <div className="flex flex-col gap-1">
          <HudLabel>Tags (comma-separated)</HudLabel>
          <SearchInput
            value={tags}
            onChange={setTags}
            placeholder="web, production"
          />
        </div>

        <div className="flex flex-col gap-3">
          <HudLabel>SSH Keys</HudLabel>
          {isLoading ? (
            <Skeleton variant="text" />
          ) : sshKeys.length === 0 ? (
            <Text variant="muted">
              No SSH keys found. Add one in Compute &gt; SSH Keys first.
            </Text>
          ) : (
            <div className="flex flex-col gap-2">
              {sshKeys.map((key) => (
                <Checkbox
                  key={key.key}
                  checked={selectedKeyIds.has(key.key)}
                  onChange={() => toggleKey(key.key)}
                >
                  <span className="font-mono text-sm">
                    {key.label || key.key.slice(0, 30) + '...'}
                  </span>
                </Checkbox>
              ))}
            </div>
          )}
        </div>
      </div>
    </WizardStep>
  )
}

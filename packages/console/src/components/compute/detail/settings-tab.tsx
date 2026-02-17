'use client'

import { useState } from 'react'
import {
  Alert,
  Button,
  GlowLine,
  HudLabel,
  TerminalCard,
  Text,
} from '@/components/data-terminal'
import { DeleteConfirmationModal } from '@/components/resources/delete-confirmation-modal'
import type { Instance } from 'aleph-sdk'
import { Trash2 } from 'lucide-react'

interface SettingsTabProps {
  instance: Instance
  onDelete: () => void
  isDeleting: boolean
}

export function SettingsTab({
  instance,
  onDelete,
  isDeleting,
}: SettingsTabProps) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <TerminalCard tag="CONFIG" label="Configuration">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3 text-sm">
            <HudLabel>Name</HudLabel>
            <span className="font-mono">{instance.name || '—'}</span>
          </div>
          <GlowLine />
          <div className="flex items-center gap-3 text-sm">
            <HudLabel>SSH Keys</HudLabel>
            <Text variant="muted">
              Manage SSH keys in Compute &gt; SSH Keys
            </Text>
          </div>
          <GlowLine />
          <div className="flex items-center gap-3 text-sm">
            <HudLabel>Environment Variables</HudLabel>
            <Text variant="muted">
              Not yet configurable from the console.
            </Text>
          </div>
        </div>
      </TerminalCard>

      <TerminalCard tag="DANGER" label="Danger Zone">
        <div className="flex flex-col gap-3 p-4">
          <Alert variant="error">
            Deleting this instance is permanent and cannot be undone.
            All data will be lost.
          </Alert>
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Trash2 size={14} />}
              onClick={() => setShowDelete(true)}
            >
              Delete Instance
            </Button>
          </div>
        </div>
      </TerminalCard>

      <DeleteConfirmationModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => {
          onDelete()
          setShowDelete(false)
        }}
        resourceName={instance.name || instance.id}
        resourceType="Instance"
        highRisk
        isDeleting={isDeleting}
      />
    </div>
  )
}

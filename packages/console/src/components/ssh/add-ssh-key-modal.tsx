'use client'

import { useState } from 'react'
import {
  TerminalModal,
  Button,
  SearchInput,
  Textarea,
  Text,
  Alert,
} from '@/components/data-terminal'

interface AddSSHKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (key: string, label: string) => void
  isSubmitting?: boolean
}

export function AddSSHKeyModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: AddSSHKeyModalProps) {
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')

  function handleSubmit() {
    const trimmedKey = key.trim()
    if (!trimmedKey) {
      setError('SSH key is required')
      return
    }
    if (
      !trimmedKey.startsWith('ssh-rsa') &&
      !trimmedKey.startsWith('ssh-ed25519') &&
      !trimmedKey.startsWith('ecdsa-')
    ) {
      setError('Invalid SSH key format. Key must start with ssh-rsa, ssh-ed25519, or ecdsa-')
      return
    }
    setError('')
    onSubmit(trimmedKey, label.trim())
  }

  function handleClose() {
    setKey('')
    setLabel('')
    setError('')
    onClose()
  }

  return (
    <TerminalModal
      open={isOpen}
      onClose={handleClose}
      title="Add SSH Key"
      size="md"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Text variant="small">Label (optional)</Text>
          <SearchInput
            value={label}
            onChange={setLabel}
            placeholder="e.g. My Laptop"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Text variant="small">Public Key</Text>
          <Textarea
            value={key}
            onChange={setKey}
            placeholder="ssh-rsa AAAA... or ssh-ed25519 AAAA..."
            rows={5}
            className="font-mono text-xs"
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Adding...' : 'Add Key'}
          </Button>
        </div>
      </div>
    </TerminalModal>
  )
}

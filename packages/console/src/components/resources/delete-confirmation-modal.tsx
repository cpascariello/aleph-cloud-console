'use client'

import { useState } from 'react'
import {
  TerminalModal,
  Alert,
  Button,
  SearchInput,
  Text,
} from '@/components/data-terminal'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  resourceName: string
  resourceType: string
  highRisk?: boolean
  isDeleting?: boolean
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  resourceName,
  resourceType,
  highRisk = false,
  isDeleting = false,
}: DeleteConfirmationModalProps) {
  const [confirmText, setConfirmText] = useState('')

  const canConfirm = highRisk
    ? confirmText === resourceName
    : true

  function handleConfirm() {
    if (!canConfirm) return
    onConfirm()
    setConfirmText('')
  }

  function handleClose() {
    setConfirmText('')
    onClose()
  }

  return (
    <TerminalModal
      open={isOpen}
      onClose={handleClose}
      title={`Delete ${resourceType}`}
      size="sm"
    >
      <div className="flex flex-col gap-4">
        <Alert variant="error">
          This action cannot be undone. This will permanently delete the{' '}
          {resourceType.toLowerCase()}.
        </Alert>

        {highRisk && (
          <div className="flex flex-col gap-2">
            <Text variant="small">
              Type <span className="font-mono text-accent">{resourceName}</span> to
              confirm:
            </Text>
            <SearchInput
              value={confirmText}
              onChange={setConfirmText}
              placeholder={resourceName}
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={!canConfirm || isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </TerminalModal>
  )
}

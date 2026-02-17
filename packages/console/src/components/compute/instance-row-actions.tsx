'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, IconButton } from '@/components/data-terminal'
import { DeleteConfirmationModal } from '@/components/resources/delete-confirmation-modal'
import { Settings, Trash2 } from 'lucide-react'

interface InstanceRowActionsProps {
  id: string
  name: string
  onDelete: (id: string) => void
  isDeleting?: boolean
}

export function InstanceRowActions({
  id,
  name,
  onDelete,
  isDeleting = false,
}: InstanceRowActionsProps) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <>
      <div className="flex items-center gap-1">
        <Link href={`/compute/${id}`}>
          <Button variant="ghost" size="sm" iconLeft={<Settings size={14} />}>
            Manage
          </Button>
        </Link>
        <IconButton
          variant="ghost"
          size="sm"
          icon={<Trash2 size={14} />}
          aria-label="Delete"
          onClick={() => setShowDelete(true)}
        />
      </div>
      <DeleteConfirmationModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => {
          onDelete(id)
          setShowDelete(false)
        }}
        resourceName={name || id}
        resourceType="Instance"
        highRisk
        isDeleting={isDeleting}
      />
    </>
  )
}

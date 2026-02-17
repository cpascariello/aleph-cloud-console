'use client'

import { useState } from 'react'
import {
  Badge,
  Button,
  CopyButton,
  IconButton,
  StatusDot,
  HudLabel,
} from '@/components/data-terminal'
import { DeleteConfirmationModal } from '@/components/resources/delete-confirmation-modal'
import { truncateHash } from '@/lib/format'
import {
  Play,
  Square,
  RotateCcw,
  Trash2,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

interface DetailHeaderProps {
  name: string
  id: string
  confirmed?: boolean | undefined
  paymentMethod?: string | undefined
  onDelete: () => void
  isDeleting?: boolean | undefined
  backHref: string
  backLabel: string
  actions?: boolean | undefined
}

export function DetailHeader({
  name,
  id,
  confirmed,
  paymentMethod,
  onDelete,
  isDeleting = false,
  backHref,
  backLabel,
  actions = false,
}: DetailHeaderProps) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-4">
        <Link
          href={backHref}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors w-fit"
        >
          <ArrowLeft size={14} />
          {backLabel}
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-heading">
              {name || truncateHash(id)}
            </h1>
            <div className="flex items-center gap-2">
              <StatusDot
                variant={confirmed ? 'success' : 'warning'}
              />
              <Badge variant={confirmed ? 'success' : 'warning'}>
                {confirmed ? 'Running' : 'Pending'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {actions && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft={<Play size={14} />}
                >
                  Start
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft={<Square size={14} />}
                >
                  Stop
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft={<RotateCcw size={14} />}
                >
                  Reboot
                </Button>
              </>
            )}
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Trash2 size={14} />}
              aria-label="Delete"
              onClick={() => setShowDelete(true)}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <HudLabel>ID</HudLabel>
            <span className="font-mono">{truncateHash(id)}</span>
            <CopyButton text={id} />
          </div>
          {paymentMethod && (
            <div className="flex items-center gap-2">
              <HudLabel>Payment</HudLabel>
              <Badge variant="info">{paymentMethod}</Badge>
            </div>
          )}
        </div>
      </div>
      <DeleteConfirmationModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => {
          onDelete()
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

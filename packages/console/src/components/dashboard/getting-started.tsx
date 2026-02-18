'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Button,
  Checkbox,
  TerminalCard,
  TypewriterText,
  GlowLine,
  Heading,
  Text,
} from '@/components/data-terminal'
import { useSSHKeys } from '@/hooks/queries/use-ssh-keys'
import { useInstances } from '@/hooks/queries/use-instances'
import { useDomains } from '@/hooks/queries/use-domains'
import { useWallet } from '@/providers/wallet-provider'

const STORAGE_KEY = 'aleph-console-onboarding-dismissed'

interface ChecklistItem {
  id: string
  label: string
  completed: boolean
  href: string
  ctaLabel: string
}

export function GettingStarted() {
  const [dismissed, setDismissed] = useState(true)
  const { isConnected, openModal } = useWallet()
  const sshKeys = useSSHKeys()
  const instances = useInstances()
  const domains = useDomains()

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setDismissed(stored === 'true')
  }, [])

  const dismiss = useCallback(() => {
    setDismissed(true)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  if (dismissed) return null

  const items: ChecklistItem[] = [
    {
      id: 'wallet',
      label: 'Connect wallet',
      completed: isConnected,
      href: '#',
      ctaLabel: 'Connect',
    },
    {
      id: 'ssh',
      label: 'Add an SSH key',
      completed: (sshKeys.data?.length ?? 0) > 0,
      href: '/compute/ssh-keys',
      ctaLabel: 'Add Key',
    },
    {
      id: 'instance',
      label: 'Deploy your first instance',
      completed: (instances.data?.length ?? 0) > 0,
      href: '/compute/new',
      ctaLabel: 'Deploy',
    },
    {
      id: 'domain',
      label: 'Link a custom domain',
      completed: (domains.data?.length ?? 0) > 0,
      href: '/infrastructure/domains/new',
      ctaLabel: 'Add Domain',
    },
  ]

  const allCompleted = items.every((item) => item.completed)

  if (allCompleted) return null

  return (
    <TerminalCard tag="INIT" label="Getting Started">
      <div className="flex flex-col gap-4 p-4">
        <div>
          <Heading level={4}>Welcome to Aleph Cloud</Heading>
          <TypewriterText speed={30} className="text-muted-foreground mt-1">
            Your infrastructure starts here...
          </TypewriterText>
        </div>
        <GlowLine />
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between"
            >
              <Checkbox
                checked={item.completed}
                disabled={item.completed}
              >
                <span
                  className={
                    item.completed
                      ? 'line-through text-muted-foreground'
                      : ''
                  }
                >
                  {item.label}
                </span>
              </Checkbox>
              {!item.completed &&
                (item.id === 'wallet' ? (
                  <Button variant="ghost" size="sm" onClick={openModal}>
                    {item.ctaLabel}
                  </Button>
                ) : (
                  <Link href={item.href}>
                    <Button variant="ghost" size="sm">
                      {item.ctaLabel}
                    </Button>
                  </Link>
                ))}
            </div>
          ))}
        </div>
        <GlowLine />
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            <Text variant="small" as="span">
              Dismiss checklist
            </Text>
          </Button>
        </div>
      </div>
    </TerminalCard>
  )
}

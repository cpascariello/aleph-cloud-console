'use client'

import {
  Badge,
  Button,
  GlowLine,
  TerminalCard,
  Text,
} from '@/components/data-terminal'
import { truncateHash } from '@/lib/format'
import type { Instance } from 'aleph-sdk'
import { Globe, HardDrive, Plus } from 'lucide-react'
import Link from 'next/link'

interface NetworkingTabProps {
  instance: Instance
}

export function NetworkingTab({ instance }: NetworkingTabProps) {
  // Extract volumes and domains from instance content
  const volumes = (
    (instance as Record<string, unknown>)['volumes'] as
      | Array<{ ref?: string; mount?: string; name?: string }>
      | undefined
  ) ?? []

  return (
    <div className="flex flex-col gap-4">
      <TerminalCard tag="STORAGE" label="Volumes">
        <div className="flex flex-col gap-3 p-4">
          {volumes.length === 0 ? (
            <Text variant="muted">No volumes attached.</Text>
          ) : (
            volumes.map((vol, i) => (
              <div key={vol.ref ?? i}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm">
                    <HardDrive size={14} className="text-accent" />
                    <span className="font-mono">
                      {vol.name || (vol.ref ? truncateHash(vol.ref) : `Volume ${i + 1}`)}
                    </span>
                    {vol.mount && (
                      <Badge variant="neutral">{vol.mount}</Badge>
                    )}
                  </div>
                </div>
                {i < volumes.length - 1 && <GlowLine />}
              </div>
            ))
          )}
          <div className="flex justify-end pt-2">
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<Plus size={14} />}
            >
              Attach Volume
            </Button>
          </div>
        </div>
      </TerminalCard>

      <TerminalCard tag="DNS" label="Domains">
        <div className="flex flex-col gap-3 p-4">
          <Text variant="muted">
            No domains linked. Link a domain from the Domains page.
          </Text>
          <div className="flex justify-end pt-2">
            <Link href="/infrastructure/domains/new">
              <Button
                variant="ghost"
                size="sm"
                iconLeft={<Globe size={14} />}
              >
                Link Domain
              </Button>
            </Link>
          </div>
        </div>
      </TerminalCard>
    </div>
  )
}

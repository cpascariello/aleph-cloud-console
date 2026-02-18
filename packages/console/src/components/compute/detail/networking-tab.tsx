'use client'

import {
  Badge,
  Button,
  GlowLine,
  TerminalCard,
  Text,
} from '@/components/data-terminal'
import { VolumeWizardContent } from '@/components/infrastructure/volume-wizard-content'
import { DomainWizardContent } from '@/components/infrastructure/domain-wizard-content'
import { useDrawer } from '@/hooks/use-drawer'
import { truncateHash } from '@/lib/format'
import type { Instance } from 'aleph-sdk'
import { Globe, HardDrive, Plus } from 'lucide-react'

interface NetworkingTabProps {
  instance: Instance
}

export function NetworkingTab({ instance }: NetworkingTabProps) {
  const { openDrawer, closeDrawer } = useDrawer()

  const volumes = (
    (instance as Record<string, unknown>)['volumes'] as
      | Array<{ ref?: string; mount?: string; name?: string }>
      | undefined
  ) ?? []

  const handleAttachVolume = () => {
    openDrawer({
      title: 'Attach Volume',
      tag: 'NEW',
      content: (
        <VolumeWizardContent
          variant="drawer"
          onComplete={closeDrawer}
          onBack={closeDrawer}
        />
      ),
    })
  }

  const handleLinkDomain = () => {
    openDrawer({
      title: 'Link Domain',
      tag: 'NEW',
      content: (
        <DomainWizardContent
          variant="drawer"
          defaultTargetRef={instance.id}
          onComplete={closeDrawer}
          onBack={closeDrawer}
        />
      ),
    })
  }

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
              onClick={handleAttachVolume}
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
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<Globe size={14} />}
              onClick={handleLinkDomain}
            >
              Link Domain
            </Button>
          </div>
        </div>
      </TerminalCard>
    </div>
  )
}

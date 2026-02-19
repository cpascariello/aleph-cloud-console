'use client'

import {
  CopyButton,
  GlowLine,
  HudLabel,
  TerminalCard,
  Text,
} from '@/components/data-terminal'
import { useSSHKeys } from '@/hooks/queries/use-ssh-keys'
import { formatDate, truncateHash } from '@/lib/format'
import type { Instance, SSHKey } from 'aleph-sdk'
import { Cpu, ExternalLink, HardDrive, Key, MemoryStick } from 'lucide-react'

interface OverviewTabProps {
  instance: Instance
}

export function OverviewTab({ instance }: OverviewTabProps) {
  const { data: sshKeys } = useSSHKeys()

  const authorizedKeys: string[] = instance.authorized_keys ?? []

  const matchedKeys = authorizedKeys.map((pubKey) => {
    const match = sshKeys?.find((sk) => sk.key === pubKey)
    return match ?? null
  })

  return (
    <div className="flex flex-col gap-4">
      <InstanceDetailsCard instance={instance} />
      <SSHKeysCard
        authorizedKeys={authorizedKeys}
        matchedKeys={matchedKeys}
      />
    </div>
  )
}

function InstanceDetailsCard({ instance }: { instance: Instance }) {
  const vcpus = instance.resources?.vcpus ?? 0
  const memory = instance.resources?.memory ?? 0

  return (
    <TerminalCard tag="SYS" label="Instance Details">
      <div className="flex flex-col gap-3 p-4 overflow-hidden">
        <div className="flex items-center gap-3 text-sm">
          <HudLabel>Item Hash</HudLabel>
          <span className="font-mono text-xs truncate">{instance.id}</span>
          <CopyButton text={instance.id} />
        </div>
        <GlowLine />
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-accent" />
            <HudLabel>CPU</HudLabel>
            <span>{vcpus} vCPU</span>
          </div>
          <div className="flex items-center gap-2">
            <MemoryStick size={14} className="text-accent" />
            <HudLabel>RAM</HudLabel>
            <span>{memory} MB</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive size={14} className="text-accent" />
            <HudLabel>Storage</HudLabel>
            <span>{instance.size ? `${instance.size} MB` : '—'}</span>
          </div>
        </div>
        <GlowLine />
        <div className="flex items-center gap-3 text-sm min-w-0">
          <HudLabel>Explorer</HudLabel>
          <a
            href={instance.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline font-mono text-xs inline-flex items-center gap-1 min-w-0"
          >
            <span className="truncate">{instance.url}</span>
            <ExternalLink size={12} className="shrink-0" />
          </a>
        </div>
        <GlowLine />
        <div className="flex items-center gap-3 text-sm">
          <HudLabel>Created</HudLabel>
          <span>{formatDate(instance.date)}</span>
        </div>
      </div>
    </TerminalCard>
  )
}

function SSHKeysCard({
  authorizedKeys,
  matchedKeys,
}: {
  authorizedKeys: string[]
  matchedKeys: (SSHKey | null)[]
}) {
  return (
    <TerminalCard tag="AUTH" label="SSH Keys">
      <div className="flex flex-col gap-3 p-4">
        {authorizedKeys.length === 0 ? (
          <Text variant="muted">No SSH keys configured.</Text>
        ) : (
          authorizedKeys.map((pubKey, i) => {
            const match = matchedKeys[i]
            return (
              <div key={match?.id ?? i}>
                <div className="flex items-center gap-3 text-sm">
                  <Key size={14} className="text-accent" />
                  {match ? (
                    <>
                      <span>{match.label || match.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {truncateHash(match.id)}
                      </span>
                    </>
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground truncate">
                      {truncateHash(pubKey, 16)}
                    </span>
                  )}
                </div>
                {i < authorizedKeys.length - 1 && <GlowLine />}
              </div>
            )
          })
        )}
      </div>
    </TerminalCard>
  )
}

'use client'

import {
  GlowLine,
  HudLabel,
  TerminalCard,
} from '@/components/data-terminal'
import { formatDate, relativeTime } from '@/lib/format'
import type { Instance } from 'aleph-sdk'
import { Cpu, MemoryStick, HardDrive, Clock, Key } from 'lucide-react'

interface OverviewTabProps {
  instance: Instance
}

export function OverviewTab({ instance }: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <TerminalCard tag="SPECS" label="Resources">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3 text-sm">
            <Cpu size={14} className="text-accent" />
            <HudLabel>CPU</HudLabel>
            <span>
              {String((instance as Record<string, unknown>)['vcpus'] ?? '—')} vCPU
            </span>
          </div>
          <GlowLine />
          <div className="flex items-center gap-3 text-sm">
            <MemoryStick size={14} className="text-accent" />
            <HudLabel>RAM</HudLabel>
            <span>
              {String((instance as Record<string, unknown>)['memory'] ?? '—')} MB
            </span>
          </div>
          <GlowLine />
          <div className="flex items-center gap-3 text-sm">
            <HardDrive size={14} className="text-accent" />
            <HudLabel>Storage</HudLabel>
            <span>{instance.size ? `${instance.size} MB` : '—'}</span>
          </div>
        </div>
      </TerminalCard>

      <TerminalCard tag="INFO" label="Details">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3 text-sm">
            <Clock size={14} className="text-accent" />
            <HudLabel>Created</HudLabel>
            <span>{formatDate(instance.date)}</span>
          </div>
          <GlowLine />
          <div className="flex items-center gap-3 text-sm">
            <Clock size={14} className="text-accent" />
            <HudLabel>Uptime</HudLabel>
            <span>{relativeTime(instance.date)}</span>
          </div>
          <GlowLine />
          <div className="flex items-center gap-3 text-sm">
            <Key size={14} className="text-accent" />
            <HudLabel>SSH Keys</HudLabel>
            <span>
              {(
                instance as Record<string, unknown>
              )['authorized_keys']
                ? 'Configured'
                : 'None'}
            </span>
          </div>
        </div>
      </TerminalCard>

      {instance.url && (
        <TerminalCard tag="ACCESS" label="Endpoint">
          <div className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2 text-sm">
              <HudLabel>URL</HudLabel>
              <a
                href={instance.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-mono text-xs"
              >
                {instance.url}
              </a>
            </div>
          </div>
        </TerminalCard>
      )}
    </div>
  )
}

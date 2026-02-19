'use client'

import {
  CopyButton,
  HudLabel,
  Skeleton,
  TerminalCard,
  TerminalTabs,
  Text,
} from '@/components/data-terminal'
import type { ForwardedPort } from '@/hooks/queries/use-forwarded-ports'
import {
  formatSSHCommand,
  getIPv4Address,
  getIPv6Address,
  getSSHForwardedPort,
} from '@/lib/ssh'
import type { ExecutableStatus } from 'aleph-sdk'
import { AlertTriangle, CircleOff, Terminal } from 'lucide-react'

interface ConnectionMethodsProps {
  status: ExecutableStatus | undefined
  ports: ForwardedPort[]
  isPending: boolean
  isError: boolean
}

export function ConnectionMethods({
  status,
  ports,
  isPending,
  isError,
}: ConnectionMethodsProps) {
  if (isPending) {
    return (
      <TerminalCard tag="CONN" label="Connection Methods">
        <div className="flex flex-col gap-3 p-4">
          <Skeleton variant="text" />
          <Skeleton variant="text" />
          <Skeleton variant="text" />
        </div>
      </TerminalCard>
    )
  }

  if (isError) {
    return (
      <TerminalCard tag="CONN" label="Connection Methods">
        <div className="flex items-center gap-2 p-4 text-sm text-warning">
          <AlertTriangle size={16} />
          <span>
            Unable to reach compute node. The instance may still be
            running.
          </span>
        </div>
      </TerminalCard>
    )
  }

  if (!status) {
    return (
      <TerminalCard tag="CONN" label="Connection Methods">
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <CircleOff size={16} />
          <span>
            No compute node allocated. Connection details unavailable.
          </span>
        </div>
      </TerminalCard>
    )
  }

  const sshPort = getSSHForwardedPort(ports)
  const ipv4 = getIPv4Address(status)
  const ipv6 = getIPv6Address(status)

  return (
    <TerminalCard tag="CONN" label="Connection Methods">
      <TerminalTabs
        tabs={[
          {
            label: 'IPv4',
            content: (
              <ConnectionTab ip={ipv4} sshPort={sshPort} />
            ),
          },
          {
            label: 'IPv6',
            content: <ConnectionTab ip={ipv6} />,
          },
        ]}
      />
    </TerminalCard>
  )
}

function ConnectionTab({
  ip,
  sshPort,
}: {
  ip: string | undefined
  sshPort?: number | undefined
}) {
  if (!ip) {
    return (
      <div className="p-4">
        <Text variant="muted">
          Not available for this instance.
        </Text>
      </div>
    )
  }

  const sshCommand = formatSSHCommand(ip, sshPort)

  return (
    <div className="flex flex-col gap-3 p-4">
      <ConnectionDetail
        label="SSH Command"
        value={sshCommand}
      />
      <ConnectionDetail label="IP Address" value={ip} />
    </div>
  )
}

function ConnectionDetail({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <HudLabel>{label}</HudLabel>
      <div className="flex items-center gap-2">
        <Terminal size={14} className="text-accent" />
        <span className="font-mono text-xs">{value}</span>
        <CopyButton text={value} />
      </div>
    </div>
  )
}

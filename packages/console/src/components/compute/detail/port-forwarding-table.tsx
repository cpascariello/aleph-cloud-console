'use client'

import {
  Badge,
  Skeleton,
  TerminalCard,
  Text,
} from '@/components/data-terminal'
import type { ForwardedPort } from '@/hooks/queries/use-forwarded-ports'

interface PortForwardingTableProps {
  ports: ForwardedPort[]
  isPending: boolean
}

export function PortForwardingTable({
  ports,
  isPending,
}: PortForwardingTableProps) {
  if (isPending) {
    return (
      <TerminalCard tag="PORTS" label="Port Forwarding">
        <div className="p-4">
          <Skeleton variant="text" />
          <Skeleton variant="text" />
        </div>
      </TerminalCard>
    )
  }

  if (ports.length === 0) {
    return (
      <TerminalCard tag="PORTS" label="Port Forwarding">
        <div className="p-4">
          <Text variant="muted">
            No port forwarding configured.
          </Text>
        </div>
      </TerminalCard>
    )
  }

  return (
    <TerminalCard tag="PORTS" label="Port Forwarding">
      <div className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="pb-2 text-left font-display text-[11px] tracking-wider text-muted-foreground">
                Source
              </th>
              <th className="pb-2 text-left font-display text-[11px] tracking-wider text-muted-foreground">
                Destination
              </th>
              <th className="pb-2 text-left font-display text-[11px] tracking-wider text-muted-foreground">
                Protocol
              </th>
            </tr>
          </thead>
          <tbody>
            {ports.map((port) => (
              <tr
                key={port.source}
                className="border-b border-border/50 last:border-0"
              >
                <td className="py-2 font-mono">
                  {port.source}
                </td>
                <td className="py-2 font-mono">
                  {port.destination ?? '\u2014'}
                </td>
                <td className="py-2">
                  <div className="flex flex-row gap-1">
                    {port.tcp && (
                      <Badge variant="neutral">TCP</Badge>
                    )}
                    {port.udp && (
                      <Badge variant="neutral">UDP</Badge>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TerminalCard>
  )
}

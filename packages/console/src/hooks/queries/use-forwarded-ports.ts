import { useEffect, useMemo, useState } from 'react'
import { useManagers } from '@/hooks/use-managers'
import type { PortProtocol, ExecutableStatus } from 'aleph-sdk'

export type ForwardedPort = {
  source: number
  destination: number | undefined
  tcp: boolean
  udp: boolean
  isSystem: boolean
}

export const forwardedPortKeys = {
  all: ['forwarded-ports'] as const,
  detail: (id: string) =>
    ['forwarded-ports', id] as const,
}

const SYSTEM_SSH_PORT = 22

export function mergePortsWithMappings(
  aggregatePorts: Record<number, PortProtocol> | undefined,
  mappedPorts: ExecutableStatus['mappedPorts'],
): ForwardedPort[] {
  const ports = new Map<number, ForwardedPort>()

  // Always include system SSH port
  const sshMapping = mappedPorts?.[String(SYSTEM_SSH_PORT)]
  ports.set(SYSTEM_SSH_PORT, {
    source: SYSTEM_SSH_PORT,
    destination: sshMapping?.host,
    tcp: true,
    udp: false,
    isSystem: true,
  })

  // Merge aggregate (user-configured) ports
  if (aggregatePorts) {
    for (const [portStr, protocol] of Object.entries(
      aggregatePorts,
    )) {
      const source = Number(portStr)
      if (source === SYSTEM_SSH_PORT) continue

      const mapping = mappedPorts?.[portStr]
      ports.set(source, {
        source,
        destination: mapping?.host,
        tcp: protocol.tcp,
        udp: protocol.udp,
        isSystem: false,
      })
    }
  }

  return [...ports.values()].sort(
    (a, b) => a.source - b.source,
  )
}

export function useForwardedPorts(
  instanceId: string | undefined,
  executableStatus: ExecutableStatus | undefined,
) {
  const { forwardedPortsManager } = useManagers()
  const [aggregatePorts, setAggregatePorts] = useState<
    Record<number, PortProtocol> | undefined
  >()
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!instanceId || !executableStatus) return

    let cancelled = false
    setIsPending(true)

    forwardedPortsManager
      .getByEntityHash(instanceId)
      .then((result) => {
        if (!cancelled) setAggregatePorts(result?.ports)
      })
      .catch(() => {
        // No aggregate exists — use empty ports
      })
      .finally(() => {
        if (!cancelled) setIsPending(false)
      })

    return () => {
      cancelled = true
    }
  }, [instanceId, executableStatus, forwardedPortsManager])

  const ports = useMemo(
    () =>
      mergePortsWithMappings(
        aggregatePorts,
        executableStatus?.mappedPorts,
      ),
    [aggregatePorts, executableStatus?.mappedPorts],
  )

  return { ports, isPending }
}

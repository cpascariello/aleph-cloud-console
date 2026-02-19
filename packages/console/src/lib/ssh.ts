import type { ExecutableStatus } from 'aleph-sdk'
import type { ForwardedPort } from '@/hooks/queries/use-forwarded-ports'

/**
 * Find the forwarded destination port for SSH (source port 22).
 */
export function getSSHForwardedPort(
  ports: ForwardedPort[],
): number | undefined {
  return ports.find((p) => p.source === 22)?.destination
}

/**
 * Extract the best available IPv4 address from an executable status.
 */
export function getIPv4Address(
  status: ExecutableStatus,
): string | undefined {
  return status.ipv4Parsed ?? status.hostIpv4 ?? undefined
}

/**
 * Extract the IPv6 address from an executable status.
 */
export function getIPv6Address(
  status: ExecutableStatus,
): string | undefined {
  return status.ipv6Parsed ?? undefined
}

/**
 * Format an SSH command string for connecting to an instance.
 */
export function formatSSHCommand(ip: string, port?: number): string {
  if (port) return `ssh root@${ip} -p ${port}`
  return `ssh root@${ip}`
}

import { CID } from 'multiformats/cid'

/**
 * Convert a Unix timestamp or ISO string to a formatted date string.
 */
export function getDate(time: number | string): string {
  const date =
    typeof time === 'number' ? new Date(time * 1000) : new Date(time)
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * Get an Aleph explorer URL for a message.
 */
export function getExplorerURL(params: {
  hash: string
  chain: string
  sender: string
  messageType: string
}): string {
  const { hash, chain, sender, messageType } = params
  return `https://explorer.aleph.im/address/${chain}/${sender}/message/${messageType}/${hash}`
}

/**
 * Recursively convert snake_case/kebab-case object keys to camelCase.
 */
export function convertKeysToCamelCase<T>(data: unknown): T {
  if (Array.isArray(data)) {
    return data.map((item) => convertKeysToCamelCase(item)) as T
  }

  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      const camelKey = key.replace(/[_-](\w)/g, (_, c: string) =>
        c.toUpperCase(),
      )
      result[camelKey] = convertKeysToCamelCase(value)
    }
    return result as T
  }

  return data as T
}

type ByteUnit = 'B' | 'KiB' | 'MiB' | 'GiB' | 'TiB'

const BYTE_UNITS: ByteUnit[] = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
const BYTE_MULTIPLIERS: Record<ByteUnit, number> = {
  B: 1,
  KiB: 1024,
  MiB: 1024 ** 2,
  GiB: 1024 ** 3,
  TiB: 1024 ** 4,
}

/**
 * Format a byte value into a human-readable string.
 */
export function humanReadableSize(
  value?: number,
  from: ByteUnit = 'B',
): string {
  if (value === undefined || value === 0) return '0 B'

  const bytes = value * BYTE_MULTIPLIERS[from]
  let unitIndex = 0

  let adjusted = bytes
  while (adjusted >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    adjusted /= 1024
    unitIndex++
  }

  return `${adjusted.toFixed(adjusted < 10 ? 2 : adjusted < 100 ? 1 : 0)} ${BYTE_UNITS[unitIndex]}`
}

/**
 * Convert between byte units.
 */
export function convertByteUnits(
  value: number,
  from: ByteUnit,
  to: ByteUnit,
): number {
  const bytes = value * BYTE_MULTIPLIERS[from]
  return bytes / BYTE_MULTIPLIERS[to]
}

/**
 * Round a number to a given number of decimal places.
 */
export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Get hours from a stream duration field.
 */
export function getHours(streamDuration: {
  duration: number
  unit: string
}): number {
  const { duration, unit } = streamDuration
  switch (unit) {
    case 'h':
      return duration
    case 'd':
      return duration * 24
    case 'w':
      return duration * 24 * 7
    case 'm':
      return duration * 24 * 30
    case 'y':
      return duration * 24 * 365
    default:
      return duration
  }
}

/**
 * Trigger a browser file download.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Parse a version string like "1.2.3" into a comparable number.
 */
export function getVersionNumber(version: string): number {
  if (!version) return 0

  try {
    const parts = version
      .replace(/[a-zA-Z-]/g, '')
      .split('.')
      .map(Number)

    return parts.reduce((ac, cv) => ac * 1000 + cv, 0)
  } catch {
    return 0
  }
}

/**
 * Extract a valid Ethereum address from a string.
 */
export function extractValidEthAddress(address?: string): string {
  if (!address) return ''
  const ethAddressRegex = /0x[a-fA-F0-9]{40}/g
  const match = address.match(ethAddressRegex)
  if (match && match.length > 0) {
    return match[0]!
  }
  return ''
}

/**
 * Parse GitHub releases into latest, prerelease, and outdated versions.
 */
export function getLatestReleases(
  payload: Array<{
    prerelease: boolean
    tag_name: string
    published_at: string
  }>,
  outdatedAfter = 1000 * 60 * 60 * 24 * 14,
): { latest: string | null; prerelease: string | null; outdated: string | null } {
  const versions: {
    latest: string | null
    prerelease: string | null
    outdated: string | null
  } = {
    latest: null,
    prerelease: null,
    outdated: null,
  }

  let latestReleaseDate = 0
  if (!payload) return versions

  for (const item of payload) {
    if (item.prerelease && !versions.prerelease) {
      versions.prerelease = item.tag_name
    }
    if (!item.prerelease && !versions.latest) {
      versions.latest = item.tag_name
      latestReleaseDate = new Date(item.published_at).getTime()
    }
    if (
      versions.latest &&
      versions.prerelease &&
      !versions.outdated &&
      !item.prerelease &&
      Date.now() - latestReleaseDate < outdatedAfter
    ) {
      versions.outdated = item.tag_name
    }
  }

  if (
    versions.latest &&
    versions.prerelease &&
    versions.latest > versions.prerelease.split('-')[0]!
  ) {
    versions.prerelease = null
  }

  return versions
}

/**
 * Fetch a URL with in-memory caching.
 */
const fetchCache = new Map<
  string,
  { cachedAt: number; value: unknown }
>()

export async function fetchAndCache<T = unknown, P = unknown>(
  url: string,
  cacheKey: string,
  cacheTime: number,
  parse?: (data: T) => P | Promise<P>,
): Promise<P> {
  const cached = fetchCache.get(cacheKey)
  const now = Date.now()

  if (cached && now - cached.cachedAt < cacheTime) {
    return cached.value as P
  }

  const data = await fetch(url)
  let value: unknown = await data.json()

  if (parse) {
    value = await parse(value as T)
  }

  fetchCache.set(cacheKey, { cachedAt: now, value })

  return value as P
}

/**
 * Check if a blockchain supports PAYG (Superfluid) payments.
 */
export function isBlockchainPAYGCompatible(
  blockchain?: string,
): boolean {
  if (!blockchain) return false
  // Only Base and Avalanche support Superfluid currently
  return ['BASE', 'AVAX'].includes(blockchain)
}

/**
 * Simple mutex for serializing async operations.
 */
export class Mutex {
  protected queue = Promise.resolve()

  async acquire(): Promise<() => void> {
    let release: () => void
    const next = new Promise<void>((resolve) => {
      release = resolve
    })
    const prev = this.queue
    this.queue = next
    await prev
    return release!
  }
}

/**
 * Convert an IPFS CID v0 (Qm...) to CID v1 (bafy...).
 */
export function cidV0toV1(cid: string): string {
  return CID.parse(cid).toV1().toString()
}

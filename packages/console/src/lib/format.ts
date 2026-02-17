/**
 * Truncate a hash or address for display: "0x1234...abcd"
 */
export function truncateHash(hash: string, chars = 6): string {
  if (hash.length <= chars * 2 + 3) return hash
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`
}

/**
 * Format a date string or timestamp to a human-readable relative time.
 */
export function relativeTime(date: string | number): string {
  const now = Date.now()
  const then =
    typeof date === 'number' ? date * 1000 : new Date(date).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 30) return formatDate(date)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

/**
 * Format a date string or timestamp to YYYY-MM-DD.
 */
export function formatDate(date: string | number): string {
  const d =
    typeof date === 'number' ? new Date(date * 1000) : new Date(date)
  return d.toISOString().slice(0, 10)
}

/**
 * Format a number with thousands separators.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

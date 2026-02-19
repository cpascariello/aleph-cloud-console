import type { ExecutableStatus } from 'aleph-sdk'

export type DerivedInstanceStatus = {
  label: string
  dotVariant: 'success' | 'warning' | 'error' | 'neutral'
  alert?: {
    variant: 'warning' | 'error'
    message: string
  }
}

/**
 * Derive a simplified status from CRN executable status.
 *
 * @param executableStatus - CRN status: object if fetched, null if
 *   not allocated, undefined if not yet fetched (loading/fallback).
 * @param isError - true when the CRN status fetch failed (unreachable).
 * @param confirmed - on-chain confirmation flag from the Instance entity,
 *   used as fallback while CRN status is loading.
 */
export function deriveInstanceStatus(
  executableStatus: ExecutableStatus | null | undefined,
  isError: boolean,
  confirmed: boolean,
): DerivedInstanceStatus {
  // CRN unreachable
  if (isError) {
    return {
      label: 'Unknown',
      dotVariant: 'warning',
      alert: {
        variant: 'warning',
        message:
          'Unable to reach the compute node. The displayed status may be outdated.',
      },
    }
  }

  // Not yet fetched — fall back to on-chain confirmation
  if (executableStatus === undefined) {
    return confirmed
      ? { label: 'Running', dotVariant: 'success' }
      : { label: 'Pending', dotVariant: 'warning' }
  }

  // No CRN allocated
  if (executableStatus === null) {
    return {
      label: 'Not Allocated',
      dotVariant: 'neutral',
      alert: {
        variant: 'error',
        message:
          'This instance is not allocated to any compute node.',
      },
    }
  }

  // v1 nodes don't report lifecycle — if they responded, it's running
  if (executableStatus.version === 'v1') {
    return { label: 'Running', dotVariant: 'success' }
  }

  const s = executableStatus.status

  // Running
  if (s?.running || s?.startedAt) {
    return { label: 'Running', dotVariant: 'success' }
  }

  // Stopped / Stopping
  if (s?.stoppedAt || s?.stoppingAt) {
    return {
      label: 'Stopped',
      dotVariant: 'error',
      alert: {
        variant: 'error',
        message:
          'This instance has stopped. The compute node reports it is no longer running.',
      },
    }
  }

  // Booting (preparing or starting)
  if (s?.preparingAt || s?.startingAt) {
    return {
      label: 'Booting',
      dotVariant: 'warning',
      alert: {
        variant: 'warning',
        message: 'This instance is booting up on the compute node.',
      },
    }
  }

  // Fallback: CRN responded but no recognizable lifecycle state
  return { label: 'Running', dotVariant: 'success' }
}

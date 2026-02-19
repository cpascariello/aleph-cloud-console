import { describe, it, expect } from 'vitest'
import { deriveInstanceStatus } from '@/lib/instance-status'
import type { ExecutableStatus } from 'aleph-sdk'

function makeStatus(
  overrides: Partial<NonNullable<ExecutableStatus['status']>> = {},
  version: 'v1' | 'v2' = 'v2',
): ExecutableStatus {
  return {
    version,
    hash: 'abc123',
    ipv4: '1.2.3.4',
    ipv6: '::1',
    ipv6Parsed: '::1',
    node: {} as ExecutableStatus['node'],
    status: {
      running: false,
      ...overrides,
    },
  }
}

describe('deriveInstanceStatus', () => {
  it('returns "Running" when startedAt is set and running is true', () => {
    const status = makeStatus({
      running: true,
      startedAt: '2026-02-19T14:32:00Z',
    })
    const result = deriveInstanceStatus(status, false, true)
    expect(result.label).toBe('Running')
    expect(result.dotVariant).toBe('success')
    expect(result.alert).toBeUndefined()
  })

  it('returns "Booting" when preparingAt is set but not started', () => {
    const status = makeStatus({
      running: false,
      preparingAt: '2026-02-19T14:32:00Z',
    })
    const result = deriveInstanceStatus(status, false, true)
    expect(result.label).toBe('Booting')
    expect(result.dotVariant).toBe('warning')
    expect(result.alert?.variant).toBe('warning')
  })

  it('returns "Booting" when startingAt is set but not started', () => {
    const status = makeStatus({
      running: false,
      startingAt: '2026-02-19T14:32:00Z',
    })
    const result = deriveInstanceStatus(status, false, true)
    expect(result.label).toBe('Booting')
    expect(result.dotVariant).toBe('warning')
  })

  it('returns "Stopped" when stoppedAt is set', () => {
    const status = makeStatus({
      running: false,
      stoppedAt: '2026-02-19T14:32:00Z',
    })
    const result = deriveInstanceStatus(status, false, true)
    expect(result.label).toBe('Stopped')
    expect(result.dotVariant).toBe('error')
    expect(result.alert?.variant).toBe('error')
  })

  it('returns "Stopped" when stoppingAt is set', () => {
    const status = makeStatus({
      running: false,
      stoppingAt: '2026-02-19T14:32:00Z',
    })
    const result = deriveInstanceStatus(status, false, true)
    expect(result.label).toBe('Stopped')
    expect(result.dotVariant).toBe('error')
  })

  it('returns "Not Allocated" when status is null and no error', () => {
    const result = deriveInstanceStatus(null, false, true)
    expect(result.label).toBe('Not Allocated')
    expect(result.dotVariant).toBe('neutral')
    expect(result.alert?.variant).toBe('error')
  })

  it('returns "Unknown" when isError is true (CRN unreachable)', () => {
    const result = deriveInstanceStatus(null, true, true)
    expect(result.label).toBe('Unknown')
    expect(result.dotVariant).toBe('warning')
    expect(result.alert?.variant).toBe('warning')
  })

  it('falls back to confirmed-based display when not yet fetched', () => {
    const result = deriveInstanceStatus(undefined, false, true)
    expect(result.label).toBe('Running')
    expect(result.dotVariant).toBe('success')
    expect(result.alert).toBeUndefined()
  })

  it('falls back to "Pending" when not fetched and not confirmed', () => {
    const result = deriveInstanceStatus(undefined, false, false)
    expect(result.label).toBe('Pending')
    expect(result.dotVariant).toBe('warning')
    expect(result.alert).toBeUndefined()
  })

  it('returns "Running" for v1 status (no lifecycle timestamps)', () => {
    const status = makeStatus({}, 'v1')
    const result = deriveInstanceStatus(status, false, true)
    expect(result.label).toBe('Running')
    expect(result.dotVariant).toBe('success')
  })

  it('includes timestamp in booting alert message when available', () => {
    const status = makeStatus({
      running: false,
      preparingAt: '2026-02-19T14:32:00Z',
    })
    const result = deriveInstanceStatus(status, false, true)
    expect(result.alert?.message).toContain('booting')
  })
})

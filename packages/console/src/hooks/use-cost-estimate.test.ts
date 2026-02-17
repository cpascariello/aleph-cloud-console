import { describe, it, expect } from 'vitest'
import { computeCostLines } from './use-cost-estimate'
import { PaymentMethod, PriceType } from 'aleph-sdk'
import type { PricingAggregate, PriceTypeObject } from 'aleph-sdk'

const mockPriceObject: PriceTypeObject = {
  price: {
    storage: { payg: '0.000000001', holding: '0.01' },
    computeUnit: { payg: '0.0001', holding: '1.5' },
  },
  tiers: [],
  computeUnit: { vcpus: 1, diskMib: 2048, memoryMib: 2048 },
}

const mockPricing = {
  [PriceType.Instance]: mockPriceObject,
  [PriceType.InstanceConfidential]: mockPriceObject,
  [PriceType.InstanceGpuPremium]: mockPriceObject,
  [PriceType.InstanceGpuStandard]: mockPriceObject,
  [PriceType.Program]: mockPriceObject,
  [PriceType.ProgramPersistent]: mockPriceObject,
  [PriceType.Storage]: mockPriceObject,
  [PriceType.Web3Hosting]: mockPriceObject,
} as PricingAggregate

describe('computeCostLines', () => {
  it('computes hold cost for an instance', () => {
    const result = computeCostLines({
      pricing: mockPricing,
      type: PriceType.Instance,
      paymentMethod: PaymentMethod.Hold,
      vcpus: 2,
      memory: 4096,
      storage: 10240,
    })

    expect(result.paymentMethod).toBe(PaymentMethod.Hold)
    expect(result.lines.length).toBeGreaterThan(0)
    expect(result.cost).toBeGreaterThan(0)
  })

  it('computes stream cost for an instance', () => {
    const result = computeCostLines({
      pricing: mockPricing,
      type: PriceType.Instance,
      paymentMethod: PaymentMethod.Stream,
      vcpus: 1,
      memory: 2048,
      storage: 2048,
    })

    expect(result.paymentMethod).toBe(PaymentMethod.Stream)
    expect(result.cost).toBeGreaterThan(0)
  })

  it('returns zero cost for zero resources', () => {
    const result = computeCostLines({
      pricing: mockPricing,
      type: PriceType.Instance,
      paymentMethod: PaymentMethod.Hold,
      vcpus: 0,
      memory: 0,
      storage: 0,
    })

    expect(result.cost).toBe(0)
  })

  it('computes storage-only cost', () => {
    const result = computeCostLines({
      pricing: mockPricing,
      type: PriceType.Storage,
      paymentMethod: PaymentMethod.Hold,
      storage: 1048576,
    })

    expect(result.lines.some((l) => l.name === 'Storage')).toBe(true)
    expect(result.cost).toBeGreaterThan(0)
  })
})

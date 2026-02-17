import { useMemo } from 'react'
import { usePricing } from '@/hooks/queries/use-pricing'
import {
  PaymentMethod,
  PriceType,
  type CostLine,
  type CostSummary,
  type PricingAggregate,
} from 'aleph-sdk'

export type CostEstimateParams = {
  type: PriceType
  paymentMethod: PaymentMethod
  vcpus?: number
  memory?: number
  storage?: number
  gpuModel?: string
}

/**
 * Compute cost lines from pricing data and resource parameters.
 * Exported for testing.
 */
export function computeCostLines(
  params: CostEstimateParams & { pricing: PricingAggregate },
): CostSummary {
  const {
    pricing,
    type,
    paymentMethod,
    vcpus = 0,
    memory = 0,
    storage = 0,
  } = params
  const priceObj = pricing[type]
  if (!priceObj) {
    return { paymentMethod, cost: 0, lines: [] }
  }

  const isPayg = paymentMethod === PaymentMethod.Stream
  const computeUnitPrice = parseFloat(
    isPayg
      ? priceObj.price.computeUnit.payg
      : priceObj.price.computeUnit.holding,
  )
  const storageUnitPrice = parseFloat(
    isPayg
      ? priceObj.price.storage.payg
      : priceObj.price.storage.holding,
  )

  const lines: CostLine[] = []

  if (vcpus > 0 || memory > 0) {
    const cu = priceObj.computeUnit
    const vcpuUnits = cu.vcpus > 0 ? vcpus / cu.vcpus : 0
    const memUnits = cu.memoryMib > 0 ? memory / cu.memoryMib : 0
    const computeUnits = Math.max(vcpuUnits, memUnits)
    const computeCost = computeUnits * computeUnitPrice

    if (computeCost > 0) {
      lines.push({
        id: 'compute',
        name: 'Compute',
        detail: `${vcpus} vCPU, ${memory} MiB RAM`,
        cost: computeCost,
      })
    }
  }

  if (storage > 0) {
    const storageCost = storage * storageUnitPrice

    if (storageCost > 0) {
      lines.push({
        id: 'storage',
        name: 'Storage',
        detail: `${storage} MiB`,
        cost: storageCost,
      })
    }
  }

  const totalCost = lines.reduce((sum, line) => sum + line.cost, 0)

  return {
    paymentMethod,
    cost: totalCost,
    lines,
  }
}

export function useCostEstimate(params: CostEstimateParams) {
  const { data: pricing, isLoading, error } = usePricing()

  // Destructure for stable dependency tracking; pass original params
  // to computeCostLines to preserve exactOptionalPropertyTypes.
  const { type, paymentMethod, vcpus, memory, storage, gpuModel } = params

  const costSummary = useMemo(() => {
    if (!pricing) return undefined
    return computeCostLines({ ...params, pricing })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps mirror params fields
  }, [pricing, type, paymentMethod, vcpus, memory, storage, gpuModel])

  return { costSummary, isLoading, error }
}

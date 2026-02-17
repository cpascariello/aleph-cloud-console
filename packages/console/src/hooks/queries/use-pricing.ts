import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import type { PricingAggregate } from 'aleph-sdk'

export const pricingKeys = {
  all: ['pricing'] as const,
}

export function usePricing() {
  const { costManager } = useManagers()

  return useQuery<PricingAggregate>({
    queryKey: pricingKeys.all,
    queryFn: () => costManager.getPricesAggregate(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

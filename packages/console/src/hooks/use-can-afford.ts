import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import { useWallet } from '@/providers/wallet-provider'
export type AffordabilityResult = {
  canAfford: boolean
  balance: number
  required: number
  deficit: number
}

/**
 * Pure computation -- exported for testing.
 */
export function computeAffordability(
  balance: number,
  cost: number | undefined,
): AffordabilityResult {
  const required = cost ?? 0
  const deficit = Math.max(0, required - balance)

  return {
    canAfford: balance >= required,
    balance,
    required,
    deficit,
  }
}

export const balanceKeys = {
  hold: (address: string) => ['balance', 'hold', address] as const,
}

export function useCanAfford(params: {
  cost: number | undefined
}) {
  const { address, isConnected } = useWallet()
  const { balanceManager } = useManagers()

  const {
    data: balance,
    isLoading,
    error,
  } = useQuery<number>({
    queryKey: balanceKeys.hold(address ?? ''),
    queryFn: () => balanceManager.getHoldBalance(address!),
    enabled: isConnected && Boolean(address),
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  const affordability = computeAffordability(
    balance ?? 0,
    params.cost,
  )

  return {
    ...affordability,
    isLoading,
    error,
  }
}

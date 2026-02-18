import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'

export type NetworkStats = {
  ccnCount: number
  crnCount: number
  totalCpu: number
  totalRamGb: number
  totalStorageGb: number
}

export const networkStatsKeys = {
  all: ['networkStats'] as const,
}

export function useNetworkStats() {
  const { nodeManager } = useManagers()

  return useQuery<NetworkStats>({
    queryKey: networkStatsKeys.all,
    queryFn: async () => {
      const [nodes, specs] = await Promise.all([
        nodeManager.getAllNodes(),
        nodeManager.getAllCRNsSpecs(),
      ])

      let totalCpu = 0
      let totalRam = 0
      let totalStorage = 0

      for (const spec of specs) {
        totalCpu += spec.cpu ?? 0
        totalRam += spec.ram ?? 0
        totalStorage += spec.storage ?? 0
      }

      return {
        ccnCount: nodes.ccns.length,
        crnCount: nodes.crns.length,
        totalCpu,
        totalRamGb: Math.round(totalRam / 1024),
        totalStorageGb: Math.round(totalStorage / 1024),
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

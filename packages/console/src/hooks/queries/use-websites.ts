import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import type { Website } from 'aleph-sdk'

export const websiteKeys = {
  all: ['websites'] as const,
  detail: (id: string) => ['websites', id] as const,
}

export function useWebsites() {
  const { websiteManager, accountAddress } = useManagers()

  return useQuery<Website[]>({
    queryKey: [...websiteKeys.all, accountAddress],
    queryFn: () => websiteManager.getAll(),
    enabled: !!accountAddress,
    refetchInterval: 30_000,
  })
}

export function useWebsite(id: string) {
  const { websiteManager } = useManagers()

  return useQuery<Website | null>({
    queryKey: websiteKeys.detail(id),
    queryFn: async () => (await websiteManager.get(id)) ?? null,
    enabled: Boolean(id),
  })
}

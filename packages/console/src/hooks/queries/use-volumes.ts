import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import type { Volume } from 'aleph-sdk'

export const volumeKeys = {
  all: ['volumes'] as const,
  detail: (id: string) => ['volumes', id] as const,
}

export function useVolumes() {
  const { volumeManager, accountAddress } = useManagers()

  return useQuery<Volume[]>({
    queryKey: [...volumeKeys.all, accountAddress],
    queryFn: () => volumeManager.getAll(),
    enabled: !!accountAddress,
    refetchInterval: 30_000,
  })
}

export function useVolume(id: string) {
  const { volumeManager } = useManagers()

  return useQuery<Volume | null>({
    queryKey: volumeKeys.detail(id),
    queryFn: async () => (await volumeManager.get(id)) ?? null,
    enabled: Boolean(id),
  })
}

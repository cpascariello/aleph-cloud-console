import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import type { Volume } from 'aleph-sdk'

export const volumeKeys = {
  all: ['volumes'] as const,
  detail: (id: string) => ['volumes', id] as const,
}

export function useVolumes() {
  const { volumeManager } = useManagers()

  return useQuery<Volume[]>({
    queryKey: volumeKeys.all,
    queryFn: () => volumeManager.getAll(),
    refetchInterval: 30_000,
  })
}

export function useVolume(id: string) {
  const { volumeManager } = useManagers()

  return useQuery<Volume | undefined>({
    queryKey: volumeKeys.detail(id),
    queryFn: () => volumeManager.get(id),
    enabled: Boolean(id),
  })
}

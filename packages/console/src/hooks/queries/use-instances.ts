import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import type { Instance } from 'aleph-sdk'

export const instanceKeys = {
  all: ['instances'] as const,
  detail: (id: string) => ['instances', id] as const,
}

export function useInstances() {
  const { instanceManager, accountAddress } = useManagers()

  return useQuery<Instance[]>({
    queryKey: [...instanceKeys.all, accountAddress],
    queryFn: () => instanceManager.getAll(),
    enabled: !!accountAddress,
    refetchInterval: 30_000,
  })
}

export function useInstance(id: string) {
  const { instanceManager } = useManagers()

  return useQuery<Instance | null>({
    queryKey: instanceKeys.detail(id),
    queryFn: async () => (await instanceManager.get(id)) ?? null,
    enabled: Boolean(id),
  })
}

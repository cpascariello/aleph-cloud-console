import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import type { Instance } from 'aleph-sdk'

export const instanceKeys = {
  all: ['instances'] as const,
  detail: (id: string) => ['instances', id] as const,
}

export function useInstances() {
  const { instanceManager } = useManagers()

  return useQuery<Instance[]>({
    queryKey: instanceKeys.all,
    queryFn: () => instanceManager.getAll(),
    refetchInterval: 30_000,
  })
}

export function useInstance(id: string) {
  const { instanceManager } = useManagers()

  return useQuery<Instance | undefined>({
    queryKey: instanceKeys.detail(id),
    queryFn: () => instanceManager.get(id),
    enabled: Boolean(id),
  })
}

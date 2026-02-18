import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import type { Domain } from 'aleph-sdk'

export const domainKeys = {
  all: ['domains'] as const,
  detail: (id: string) => ['domains', id] as const,
}

export function useDomains() {
  const { domainManager, accountAddress } = useManagers()

  return useQuery<Domain[]>({
    queryKey: [...domainKeys.all, accountAddress],
    queryFn: () => domainManager.getAll(),
    enabled: !!accountAddress,
    refetchInterval: 30_000,
  })
}

export function useDomain(id: string) {
  const { domainManager } = useManagers()

  return useQuery<Domain | undefined>({
    queryKey: domainKeys.detail(id),
    queryFn: () => domainManager.get(id),
    enabled: Boolean(id),
  })
}

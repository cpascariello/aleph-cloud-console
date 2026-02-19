import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import type { ExecutableStatus, Instance } from 'aleph-sdk'

export const executableStatusKeys = {
  all: ['executable-status'] as const,
  detail: (id: string) => ['executable-status', id] as const,
}

export function useExecutableStatus(instance: Instance | undefined) {
  const { instanceManager } = useManagers()

  return useQuery<ExecutableStatus | null>({
    queryKey: executableStatusKeys.detail(instance?.id ?? ''),
    queryFn: async () =>
      (await instanceManager.checkStatus(instance!)) ?? null,
    enabled: !!instance,
    refetchInterval: 30_000,
    retry: 1,
    staleTime: 10_000,
  })
}

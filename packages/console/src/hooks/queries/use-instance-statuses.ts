import { useQueries } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import { executableStatusKeys } from '@/hooks/queries/use-executable-status'
import type { ExecutableStatus, Instance } from 'aleph-sdk'

type InstanceStatusEntry = {
  data: ExecutableStatus | null | undefined
  isError: boolean
}

/**
 * Batch CRN status checks for a list of instances.
 * Returns a Map keyed by instance ID.
 */
export function useInstanceStatuses(
  instances: Instance[],
): Map<string, InstanceStatusEntry> {
  const { instanceManager } = useManagers()

  const results = useQueries({
    queries: instances.map((instance) => ({
      queryKey: executableStatusKeys.detail(instance.id),
      queryFn: async (): Promise<ExecutableStatus | null> =>
        (await instanceManager.checkStatus(instance)) ?? null,
      refetchInterval: 60_000,
      retry: 1,
      staleTime: 30_000,
    })),
  })

  const map = new Map<string, InstanceStatusEntry>()
  for (let i = 0; i < instances.length; i++) {
    const instance = instances[i]
    const result = results[i]
    if (instance && result) {
      map.set(instance.id, {
        data: result.data,
        isError: result.isError,
      })
    }
  }

  return map
}

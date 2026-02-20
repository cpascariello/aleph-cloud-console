import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import type { Program } from 'aleph-sdk'

export const programKeys = {
  all: ['programs'] as const,
  detail: (id: string) => ['programs', id] as const,
}

export function usePrograms() {
  const { programManager, accountAddress } = useManagers()

  return useQuery<Program[]>({
    queryKey: [...programKeys.all, accountAddress],
    queryFn: () => programManager.getAll(),
    enabled: !!accountAddress,
    refetchInterval: 30_000,
  })
}

export function useProgram(id: string) {
  const { programManager } = useManagers()

  return useQuery<Program | null>({
    queryKey: programKeys.detail(id),
    queryFn: async () => (await programManager.get(id)) ?? null,
    enabled: Boolean(id),
  })
}

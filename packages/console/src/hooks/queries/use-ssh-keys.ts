import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import type { SSHKey } from 'aleph-sdk'

export const sshKeyKeys = {
  all: ['ssh-keys'] as const,
  detail: (id: string) => ['ssh-keys', id] as const,
}

export function useSSHKeys() {
  const { sshKeyManager } = useManagers()

  return useQuery<SSHKey[]>({
    queryKey: sshKeyKeys.all,
    queryFn: () => sshKeyManager.getAll(),
    refetchInterval: 30_000,
  })
}

export function useSSHKey(id: string) {
  const { sshKeyManager } = useManagers()

  return useQuery<SSHKey | undefined>({
    queryKey: sshKeyKeys.detail(id),
    queryFn: () => sshKeyManager.get(id),
    enabled: Boolean(id),
  })
}

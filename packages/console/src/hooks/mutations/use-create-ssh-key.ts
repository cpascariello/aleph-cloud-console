import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import { useToast } from '@/providers/toast-provider'
import { sshKeyKeys } from '@/hooks/queries/use-ssh-keys'
import type { AddSSHKey } from 'aleph-sdk'

export function useCreateSSHKey() {
  const { sshKeyManager } = useManagers()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async (input: AddSSHKey) => {
      for await (const _ of sshKeyManager.addSteps(input)) {
        // Each yield is a signing step
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sshKeyKeys.all })
      addToast({ message: 'SSH key added', variant: 'success' })
    },
    onError: (error) => {
      addToast({ message: error.message, variant: 'error', duration: 8000 })
    },
  })
}
